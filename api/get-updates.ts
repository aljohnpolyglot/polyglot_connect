// D:\polyglot_connect\api\get-updates.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Read keys securely from Vercel's environment
    const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
    const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;

    const query = `
        query {
            patchNoteCollection(order: releaseDate_DESC) {
                items { version, title, releaseDate, notes }
            }
        }
    `;

    try {
        const fetchResponse = await fetch(`https://graphql.contentful.com/content/v1/spaces/${SPACE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ query }),
        });

        if (!fetchResponse.ok) {
            throw new Error(`Contentful API error: ${fetchResponse.statusText}`);
        }

        const contentfulData = await fetchResponse.json();
        
        // Set CORS header to allow your frontend to access this
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(contentfulData);

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: 'Failed to fetch updates.' });
    }
}