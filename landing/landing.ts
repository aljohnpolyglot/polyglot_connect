// landing/landing.ts

// Import what we need from Firebase SDKs and our central config file
import { GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/js/firebase-config'; // Use our single source of truth!

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
async function createUserProfileIfNotExists(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    console.log(`Creating NEW user profile in Firestore for ${user.uid}`);
    try {
      await setDoc(userRef, {
        email: user.email || null,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        plan: "free",
        monthlyTextCount: 0,
        monthlyCallCount: 0,
        usageResetTimestamp: serverTimestamp()
      });
      console.log("Successfully created user profile.");
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  } else {
    console.log(`User profile for ${user.uid} already exists.`);
  }
}

// ==========================================================
// === THIS IS THE FIX: The FirebaseUI Configuration ===
// ==========================================================
const uiConfig: firebaseui.auth.Config = {
  // We use a callback to take full control after login.
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      console.log("FirebaseUI signInSuccessWithAuthResult triggered!");
      const user = authResult.user;
      
      // Call our function to create their database profile.
      // The .then() ensures we wait for the database write to complete.
      createUserProfileIfNotExists(user).then(() => {
        // NOW that their profile is created, we manually redirect them to the app.
        console.log("Profile creation/check complete. Redirecting to /app.html...");
        window.location.assign('/app.html');
      }).catch(error => {
        console.error("Failed to create profile or redirect:", error);
        // Fallback redirect in case of an error
        window.location.assign('/app.html');
      });

      // **CRITICAL**: We MUST return false to tell FirebaseUI that we have handled
      // the redirect ourselves and it should NOT do anything else.
      return false;
    },
    uiShown: function() {
      // You can hide a loading spinner here if you have one.
    }
  },
  // We REMOVE signInSuccessUrl. The callback above now handles everything.
  // signInSuccessUrl: '/app.html', // <<< THIS LINE MUST BE DELETED

  // The rest of the config is fine
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