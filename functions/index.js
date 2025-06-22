// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * This trigger runs whenever a new user is created in Firebase Auth.
 * It checks if the user's email is in our 'whitelist' collection.
 * If it is, their plan is set to 'premium'. Otherwise, it's 'free'.
 */
export const onNewUserCreate = functions.auth.user().onCreate(async (user) => {
  // Exit if the user has no email (e.g., anonymous sign-in)
  if (!user.email) {
    console.log(`User ${user.uid} has no email, skipping whitelist check.`);
    return null;
  }

  console.log(`New user created: ${user.email}. Checking whitelist...`);

  // A reference to the whitelist document for this user's email
  const whitelistRef = db.collection("whitelist").doc(user.email);

  try {
    const whitelistDoc = await whitelistRef.get();

    let userPlan = "free"; // Default plan is 'free'

    // Check if a document with their email exists in the whitelist
    if (whitelistDoc.exists) {
      userPlan = "premium";
      console.log(`Email ${user.email} FOUND in whitelist. Assigning 'premium' plan.`);
    } else {
      console.log(`Email ${user.email} not in whitelist. Assigning 'free' plan.`);
    }

    // This is the user profile object we will create in the 'users' collection.
    // It's the same object your landing.ts creates, but this is more secure
    // because it runs on the server.
    const userProfile = {
      email: user.email,
      displayName: user.displayName || "New User",
      photoURL: user.photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      plan: userPlan, // The magic happens here!
      monthlyTextCount: 0,
      monthlyCallCount: 0,
      usageResetTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create the user's document in the 'users' collection
    await db.collection("users").doc(user.uid).set(userProfile);

    console.log(`Successfully created profile for user ${user.uid} with plan: ${userPlan}`);
    return null;

  } catch (error) {
    console.error("Error in onNewUserCreate function:", error);
    return null;
  }
});

/**
 * This function runs automatically once a month to reset usage counts
 * for all FREE users.
 */
export const resetMonthlyUsageCounts = functions.pubsub
  .schedule("0 2 1 * *") // Runs at 2:00 AM on the 1st day of every month
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Running monthly usage reset function for FREE users...");
    const usersRef = db.collection("users");
    
    // Get only the users on the 'free' plan
    const snapshot = await usersRef.where("plan", "==", "free").get();

    if (snapshot.empty) {
      console.log("No free users found to reset usage for.");
      return null;
    }

    // Use a batch to update all users efficiently
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