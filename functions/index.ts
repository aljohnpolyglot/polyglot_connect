// functions/src/index.ts
// THIS IS THE COMPLETE AND CORRECT V1 SYNTAX VERSION
// It matches the `functions:config:set` command you are using.

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

// =================================================================
// INITIALIZATION
// =================================================================
admin.initializeApp();
const db = admin.firestore();

// =================================================================
// AUTH & SCHEDULED TRIGGERS (Using v1 Syntax)
// =================================================================

/**
 * v1 Syntax: This trigger runs whenever a new user is created.
 */
export const onNewUserCreate = functions.auth.user().onCreate(async (user) => {
  if (!user.email) {
    console.log(`User ${user.uid} has no email, skipping whitelist check.`);
    return null;
  }
  console.log(`New user created: ${user.email}. Checking whitelist...`);
  const whitelistRef = db.collection("whitelist").doc(user.email);
  try {
    const whitelistDoc = await whitelistRef.get();
    let userPlan = "free";
    if (whitelistDoc.exists) {
      userPlan = "premium";
      console.log(`Email ${user.email} FOUND in whitelist. Assigning 'premium' plan.`);
    } else {
      console.log(`Email ${user.email} not in whitelist. Assigning 'free' plan.`);
    }
    const userProfile = {
      email: user.email,
      displayName: user.displayName || "New User",
      photoURL: user.photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      plan: userPlan,
      monthlyTextCount: 0,
      monthlyCallCount: 0,
      usageResetTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("users").doc(user.uid).set(userProfile);
    console.log(`Successfully created profile for user ${user.uid} with plan: ${userPlan}`);
    return null;
  } catch (error) {
    console.error("Error in onNewUserCreate function:", error);
    return null;
  }
});

/**
 * v1 Syntax: This function runs at 2:00 AM on the 1st day of every month.
 */
export const resetMonthlyUsageCounts = functions.pubsub
  .schedule("0 2 1 * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Running monthly usage reset function for FREE users...");
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("plan", "==", "free").get();
    if (snapshot.empty) {
      console.log("No free users found to reset usage for.");
      return null;
    }
    const batch = db.batch();
    snapshot.forEach(doc => {
      console.log(`Resetting usage for free user ${doc.id}`);
      const userDocRef = usersRef.doc(doc.id);
      batch.update(userDocRef, {
        monthlyTextCount: 0,
        monthlyCallCount: 0,
        usageResetTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    console.log(`Successfully reset usage for ${snapshot.size} free users.`);
    return null;
  });

// =================================================================
// PADDLE PAYMENT API CODE (Using v1 Syntax)
// =================================================================
const app = express();
app.use(cors({ origin: true }));

// Uses the old config method to match your successful command
const PADDLE_API_KEY = functions.config().paddle.apikey;

let paddle: Paddle | null = null;
try {
    if (PADDLE_API_KEY) {
        paddle = new Paddle(PADDLE_API_KEY, {
            environment: Environment.production, // This uses your LIVE key
        });
        console.log("Paddle SDK Initialized in Production mode.");
    } else {
        console.error("PADDLE_APIKEY is not set in function config.");
    }
} catch (error) {
    console.error("Failed to initialize Paddle SDK:", error);
}

app.post("/createPaddleCheckoutLink", async (req, res) => {
    if (!paddle) {
        console.error("Paddle SDK not initialized.");
        return res.status(500).send("Payment service is not configured.");
    }
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(403).send("Unauthorized: No Firebase ID token was passed.");
    }
    const idToken = req.headers.authorization.split("Bearer ")[1];
    let decodedIdToken;
    try {
        decodedIdToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        return res.status(403).send("Unauthorized: Invalid token.");
    }
    const userId = decodedIdToken.uid;
    const planId: string = req.body.planId;
    const priceId: string = req.body.priceId;
    if (!priceId) {
        return res.status(400).send("Bad Request: Missing Paddle Price ID.");
    }
    try {
        console.log(`Creating Paddle checkout for user: ${userId}, priceId: ${priceId}`);
        const transaction = await paddle.transactions.create({
            items: [{ priceId: priceId, quantity: 1 }],
            customData: { firebase_user_id: userId, plan_id: planId },
        });
        if (transaction.checkout?.url) {
             return res.status(200).json({ checkoutUrl: transaction.checkout.url });
        } else {
            console.error("Paddle response did not contain a checkout URL", transaction);
            return res.status(500).send("Could not create checkout URL.");
        }
    } catch (error) {
        console.error("Error creating Paddle checkout link:", error);
        return res.status(500).send("Payment provider error.");
    }
});

app.post("/handlePaddleWebhook", (req: express.Request, res: express.Response) => {
    const event = req.body;
    console.log(`Received Paddle event: ${event.eventType}`);
    if (event.eventType === "transaction.completed") {
        const userId = event.data.customData?.firebase_user_id;
        const planId = event.data.customData?.plan_id;
        if (!userId) {
            console.error("Webhook received but is missing 'firebase_user_id' in customData.");
            return res.status(200).send("Webhook acknowledged, but no user ID found.");
        }
        db.collection("users").doc(userId).update({
            plan: "premium",
            planType: planId,
            usageResetTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        }).then(() => {
            console.log(`SUCCESS: User ${userId} upgraded to plan '${planId}' via Paddle!`);
        }).catch((error) => {
            console.error(`CRITICAL ERROR: Failed to update user ${userId} from Paddle webhook`, error);
        });
    }
    res.status(200).send();
});

// Export the Express app as a v1 https function
export const paddle_api = functions.https.onRequest(app);