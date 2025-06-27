// D:\polyglot_connect\api\create-payment.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import admin from 'firebase-admin';

// --- Firebase Admin Initialization ---
// We need to connect to your Firebase project to verify the user
const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString('ascii')
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

// --- Paddle Initialization ---
const paddle = new Paddle(process.env.PADDLE_APIKEY!, {
    environment: Environment.production,
});

// This is the entire serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Vercel needs CORS setup for POST requests from another domain
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');


    // 1. Authenticate the Firebase user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized: No token provided.');
    }
    const idToken = authHeader.split('Bearer ')[1];
    let decodedIdToken;
    try {
        decodedIdToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        return res.status(401).send('Unauthorized: Invalid token.');
    }

    // 2. Get data from the request body
    const { planId, priceId } = req.body;
    const userId = decodedIdToken.uid;
    if (!priceId) {
        return res.status(400).send('Bad Request: Missing Paddle Price ID.');
    }

    // 3. Create the Paddle Checkout Link
    try {
        const transaction = await paddle.transactions.create({
            items: [{ priceId, quantity: 1 }],
            customData: { firebase_user_id: userId, plan_id: planId },
        });

        if (transaction.checkout?.url) {
            return res.status(200).json({ checkoutUrl: transaction.checkout.url });
        } else {
            return res.status(500).send('Could not create checkout URL.');
        }
    } catch (error) {
        console.error("Paddle API Error:", error);
        return res.status(500).send('Payment provider error.');
    }
}