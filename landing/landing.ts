// landing/landing.ts
// This is the new, complete import block for landing.ts

import { GoogleAuthProvider, EmailAuthProvider, onAuthStateChanged, type User } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/js/firebase-config'; 
import whitelistedEmails from '../src/data/whitelistEmails';
// --- END: Corrected Imports ---


// --- START: Screenshot mode backdoor ---
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
// Add this entire block to the top of landing.ts

// --- START: Navbar Loading and Interactivity ---

/**
 * Fetches the navbar HTML, injects it into the page, and sets up all its interactive elements.
 * This function is self-contained for the landing page.
 */
async function initializeLandingPageNavbar() {
  // 1. Fetch and inject the navbar
  try {
      const response = await fetch('/landing/landing-navbar.html');
      if (!response.ok) throw new Error('Navbar HTML not found');
      const navbarHtml = await response.text();
      document.body.insertAdjacentHTML('afterbegin', navbarHtml);
  } catch (error) {
      console.error('Failed to load navbar:', error);
      return;
  }

  // 2. Find all the navbar elements now that they are in the DOM
  const navbar = document.getElementById('landing-navbar');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-nav-menu');
  const desktopActionsDiv = document.getElementById('landing-navbar-actions');
  const mobileActionsDiv = document.getElementById('mobile-nav-actions');

  if (!navbar || !hamburgerBtn || !mobileMenu || !desktopActionsDiv || !mobileActionsDiv) {
      console.error("One or more navbar elements are missing from landing-navbar.html.");
      return;
  }

  // 3. Set up event listeners
  hamburgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('active'));
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));

  // 4. Set up Auth-dependent buttons
  // This uses the 'auth' instance that should already be initialized in your landing.ts
  onAuthStateChanged(auth, (user: User | null) => {
    // These are the parent containers for the buttons
    const desktopActionsDiv = document.getElementById('landing-navbar-actions');
    const mobileActionsDiv = document.getElementById('mobile-nav-actions');

    // Make sure the containers exist before trying to use them
    if (!desktopActionsDiv || !mobileActionsDiv) return;

    // Force the desktop container to be visible
    desktopActionsDiv.style.display = 'block';

    if (user) {
        // User is LOGGED IN
        const enterAppHtml = `<a href="/app.html">Enter App</a>`;
        desktopActionsDiv.innerHTML = enterAppHtml;
        mobileActionsDiv.innerHTML = enterAppHtml;
    } else {
        // User is LOGGED OUT
        const signInHtml = `<a href="/">Sign In / Sign Up</a>`;
        desktopActionsDiv.innerHTML = signInHtml;
        mobileActionsDiv.innerHTML = signInHtml;
    }
});
}

// --- END: Navbar Loading and Interactivity ---

/**
 * Creates a new user document in Firestore, checking the client-side
 * whitelist to determine their plan.
 * @param user The Firebase Auth user object from a successful login.
 */
// THE FIX: We explicitly tell TypeScript that 'user' is of type 'User'.
async function createUserProfileWithWhitelistCheck(user: User) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    console.log(`Creating NEW user profile in Firestore for ${user.uid}`);
    
    let userPlan = "free";
    if (user.email && whitelistedEmails.includes(user.email.toLowerCase())) {
        userPlan = "premium";
        console.log(`Email ${user.email} FOUND in client-side whitelist. Assigning 'premium' plan.`);
    } else {
        console.log(`Email ${user.email} not in client-side whitelist. Assigning 'free' plan.`);
    }

    try {
      await setDoc(userRef, {
        email: user.email || null,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        plan: userPlan,
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
      
      // This is now correctly typed because the function it calls is typed.
      createUserProfileWithWhitelistCheck(authResult.user).then(() => {
        console.log('Profile creation/check complete. Redirecting to /app.html...');
        window.location.assign('/app.html');
      }).catch(error => {
        console.error('CRITICAL ERROR: Failed to create/check profile or redirect:', error);
        alert('There was a problem setting up your account. Please try signing in again.');
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

// This part runs when the page is loaded
document.addEventListener('DOMContentLoaded', async function() {
  // STEP 1: Await the navbar initialization.
  // The rest of the code will NOT run until the navbar is fully loaded and interactive.
  // This is the critical fix that solves the race condition.
  await initializeLandingPageNavbar(); 
  console.log("Navbar initialization complete. Proceeding with page logic.");

  // STEP 2: Now that the navbar is guaranteed to be on the page, initialize other parts.
  // Initialize the FirebaseUI Widget.
  const ui = new firebaseui.auth.AuthUI(auth);
  
  const authContainer = document.getElementById('firebaseui-auth-container');
  if (authContainer) {
      ui.start('#firebaseui-auth-container', uiConfig);
  } else {
      console.warn("FirebaseUI auth container not found on this page.");
  }

  // Initialize other interactive elements like buttons.
  const finalCtaButton = document.getElementById('final-cta-btn');
  const heroSection = document.querySelector('.hero-section');

  if (finalCtaButton && heroSection) {
      finalCtaButton.addEventListener('click', function(e) {
          e.preventDefault();
          // This is a cleaner way to scroll
          heroSection.scrollIntoView({ behavior: 'smooth' });
      });
  }

  // You can now be sure any other logic here runs AFTER the navbar is ready.
  // For example, if you have a "roster_renderer.ts" that needs to run,
  // you would call its initialization function here.
});

// NOTE: The separate navbar logic is no longer needed here because
// your reusable `navbar-loader.ts` handles it.