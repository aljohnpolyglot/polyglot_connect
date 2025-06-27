// landing/landing.ts

// Import what we need from Firebase SDKs and our central config file
import { GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/js/firebase-config'; // Use our single source of truth!
import whitelistedEmails from '../src/data/whitelistEmails'; // <<< No .ts extension needed
import { getAuth, onAuthStateChanged } from "firebase/auth";
// --- START: Screenshot mode backdoor (This part is fine) ---
(window as any).enterScreenshotMode = (secretCode: string) => {
    if (secretCode === "polyglotDev2024") {
        sessionStorage.setItem("dev_override", "true");
        console.log("%cScreenshot mode activated. Navigating to app.html...", "color: lime; font-weight: bold; font-size: 16px;");
        window.location.href = '/app.html'; 
    } else {
        console.error("Incorrect secret code.");
    }
};
console.log("%cDev Tip: To bypass login for screenshots, type enterScreenshotMode('your_secret_code') in the console.", "color: orange;");
// --- END: Screenshot mode backdoor ---

/**
 * Creates a new user document in Firestore if one doesn't already exist.
 * This is the core of our freemium user tracking.
 * @param user The Firebase Auth user object from a successful login.
 */

/**
 * Creates a new user document in Firestore, checking the client-side
 * whitelist to determine their plan.
 * @param user The Firebase Auth user object from a successful login.
 */
async function createUserProfileWithWhitelistCheck(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    console.log(`Creating NEW user profile in Firestore for ${user.uid}`);
    
    // ==========================================================
    // === START: WHITELIST CHECK LOGIC                       ===
    // ==========================================================
    let userPlan = "free"; // Default to free
    if (user.email && whitelistedEmails.includes(user.email.toLowerCase())) {
        userPlan = "premium";
        console.log(`Email ${user.email} FOUND in client-side whitelist. Assigning 'premium' plan.`);
    } else {
        console.log(`Email ${user.email} not in client-side whitelist. Assigning 'free' plan.`);
    }
    // ==========================================================

    try {
      await setDoc(userRef, {
        email: user.email || null,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        plan: userPlan, // The plan is now set based on the whitelist
        monthlyTextCount: 0,
        monthlyCallCount: 0,
        usageResetTimestamp: serverTimestamp() 
      });
      console.log(`Successfully created profile with plan: ${userPlan}`);
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  } else {
    console.log(`User profile for ${user.uid} already exists.`);
    // Optional: If they exist, check if their plan should be upgraded
    // if they were added to the whitelist AFTER signing up.
    const existingData = docSnap.data();
    if (user.email && whitelistedEmails.includes(user.email.toLowerCase()) && existingData.plan !== 'premium') {
        console.log(`User ${user.email} found in whitelist and current plan is not premium. Upgrading.`);
        try {
            await setDoc(userRef, { plan: 'premium' }, { merge: true });
            console.log(`User ${user.email} plan upgraded to premium.`);
        } catch (error) {
            console.error(`Error upgrading user ${user.email} to premium:`, error);
        }
    }
  }
}

// FirebaseUI Configuration
const uiConfig: firebaseui.auth.Config = {
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      console.log('%c LOGIN SUCCESS (Client-Side)!', 'color: lime; font-weight: bold; font-size: 16px;');
      const user = authResult.user;
      
      // Call our new function that includes the whitelist check
      createUserProfileWithWhitelistCheck(user).then(() => {
        console.log('Profile creation/check complete. Redirecting to /app.html...');
        window.location.assign('/app.html');
      }).catch(error => {
        console.error('CRITICAL ERROR: Failed to create/check profile or redirect:', error);
      });

      return false; // We handle the redirect
    },
    uiShown: function() {
      console.log("FirebaseUI widget is now visible.");
    }
  },
  signInOptions: [
    GoogleAuthProvider.PROVIDER_ID,
    EmailAuthProvider.PROVIDER_ID
  ],
  signInFlow: 'popup',
};
// ==========================================================
// === END OF FIX ===
// ==========================================================

// This part runs when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the FirebaseUI Widget and render it
    const ui = new firebaseui.auth.AuthUI(auth);
    
    // Check if the container exists before trying to start the UI
    const authContainer = document.getElementById('firebaseui-auth-container');
    if (authContainer) {
        ui.start('#firebaseui-auth-container', uiConfig);
    }

    // Your other landing page logic for carousels, smooth scroll etc. can go here
    // For example, the final CTA button smooth scroll:
    const finalCtaButton = document.getElementById('final-cta-btn');
    const heroSection = document.querySelector('.hero-section');

    if (finalCtaButton && heroSection) {
        finalCtaButton.addEventListener('click', function(e) {
            e.preventDefault();
            (heroSection as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// Add this code to the end of D:\polyglot_connect\landing\landing.ts
