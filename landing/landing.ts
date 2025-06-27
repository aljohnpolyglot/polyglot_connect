// landing/landing.ts

// --- Imports ---
import { initializeRostersAndCarousels } from './roster_renderer';
import { initializePersonaModal } from './persona_modal_renderer';
import { GoogleAuthProvider, EmailAuthProvider, onAuthStateChanged, type User } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/js/firebase-config'; 
import whitelistedEmails from '../src/data/whitelistEmails';

// --- Dev Tools ---
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

// --- Navbar Logic ---
// --- Navbar Logic ---
async function initializeLandingPageNavbar() {
  // 1. Fetch and inject the navbar HTML (no changes here)
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
  const navbar = document.getElementById('landing-navbar') as HTMLElement;
  const hamburgerBtn = document.getElementById('hamburger-btn') as HTMLButtonElement;
  const mobileMenu = document.getElementById('mobile-nav-menu') as HTMLElement;

  if (!navbar || !hamburgerBtn || !mobileMenu) {
      console.error("One or more essential navbar elements are missing from the DOM.");
      return;
  }

  // 3. Set up core event listeners
  hamburgerBtn.addEventListener('click', (e) => {
      // Stop this click from being immediately caught by the 'document' listener below
      e.stopPropagation(); 
      mobileMenu.classList.toggle('active');
  });

  window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // NEW: Add a listener to the whole document to close the menu when clicking outside
  document.addEventListener('click', (event) => {
      // Only do something if the menu is actually open
      if (mobileMenu.classList.contains('active')) {
          // Check if the click was on the menu itself or one of its children
          const isClickInsideMenu = mobileMenu.contains(event.target as Node);
          if (!isClickInsideMenu) {
              mobileMenu.classList.remove('active');
          }
      }
  });


  // 4. Set up Auth-dependent buttons with updated logic
  onAuthStateChanged(auth, (user: User | null) => {
      const desktopActionsDiv = document.getElementById('landing-navbar-actions') as HTMLElement;
      const mobileActionsDiv = document.getElementById('mobile-nav-actions') as HTMLElement;

      if (!desktopActionsDiv || !mobileActionsDiv) return;

      if (user) {
          // User is LOGGED IN: Show "Enter App" button in both places.
          // The CSS will correctly hide the desktop one on mobile view.
          const enterAppHtml = `<a href="/app.html">Enter App</a>`;
          desktopActionsDiv.innerHTML = enterAppHtml;
          mobileActionsDiv.innerHTML = enterAppHtml;
      } else {
          // User is LOGGED OUT:
          // The "Sign In" button only needs to be in the mobile menu.
          // The desktop version is hidden by CSS on mobile anyway, but we'll clear it
          // from the JS for cleaner code and to perfectly match the user request.
          const signInHtml = `<a href="/">Sign In / Sign Up</a>`;
          desktopActionsDiv.innerHTML = signInHtml; // Keep this for desktop view
          mobileActionsDiv.innerHTML = signInHtml;  // Add to hamburger menu for mobile view
      }
  });
}

// --- Firebase Auth & Firestore Logic ---
async function createUserProfileWithWhitelistCheck(user: User) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    console.log(`Creating NEW user profile in Firestore for ${user.uid}`);
    const userPlan = (user.email && whitelistedEmails.includes(user.email.toLowerCase())) ? "premium" : "free";
    console.log(`User email ${user.email} results in plan: '${userPlan}'.`);

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
  } else {
    console.log(`User profile for ${user.uid} already exists.`);
    const existingData = docSnap.data();
    if (user.email && whitelistedEmails.includes(user.email.toLowerCase()) && existingData.plan !== 'premium') {
      console.log(`Upgrading existing user ${user.email} to premium plan.`);
      await setDoc(userRef, { plan: 'premium' }, { merge: true });
    }
  }
}

const uiConfig: firebaseui.auth.Config = {
  callbacks: {
    signInSuccessWithAuthResult: (authResult) => {
      createUserProfileWithWhitelistCheck(authResult.user).then(() => {
        window.location.assign('/app.html');
      });
      return false; // We handle the redirect.
    },
    uiShown: () => {
        // Hide loader or show UI
    }
  },
  signInOptions: [GoogleAuthProvider.PROVIDER_ID, EmailAuthProvider.PROVIDER_ID],
  signInFlow: 'popup',
};

function initializeFirebaseUI() {
  const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
  const authContainer = document.getElementById('firebaseui-auth-container');
  if (authContainer) {
      ui.start('#firebaseui-auth-container', uiConfig);
  }
}

function setupCtaButtons() {
    const finalCtaButton = document.getElementById('final-cta-btn');
    const heroSection = document.querySelector('.hero-section');
    if (finalCtaButton && heroSection) {
        finalCtaButton.addEventListener('click', (e) => {
            e.preventDefault();
            heroSection.scrollIntoView({ behavior: 'smooth' });
        });
    }
}

// --- Main Initialization Sequence ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log("DOM fully loaded. Starting landing page initialization sequence.");

  await initializeLandingPageNavbar();
  console.log("SEQUENCE: Navbar loaded.");

  initializeFirebaseUI();
  console.log("SEQUENCE: FirebaseUI initialized.");

  initializeRostersAndCarousels();
  console.log("SEQUENCE: Rosters and carousels rendered.");

  initializePersonaModal();
  console.log("SEQUENCE: Persona modal ready.");
  
  setupCtaButtons();
  console.log("SEQUENCE: All initializers called. Page should be fully interactive.");
});