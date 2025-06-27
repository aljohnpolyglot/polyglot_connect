// landing/landing.ts

// --- IMPORTS (ALL AT THE TOP) ---

// A) Functionality Imports
import { GoogleAuthProvider, EmailAuthProvider, onAuthStateChanged, type User } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../src/js/firebase-config'; 
import whitelistedEmails from '../src/data/whitelistEmails';

// B) Our own module imports for initialization
import { initializeRostersAndCarousels } from './roster_renderer';
import { initializePersonaModal } from './persona_modal_renderer';

// C) *** THE KEY FIX ***
// We import the HTML content as a raw text string. The "?raw" is a command for the build tool (Vite).
import navbarHtml from '/landing/landing-navbar.html?raw';


// --- DEV TOOLS (No changes here) ---
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


// --- MODULAR FUNCTIONS ---

function initializeLandingPageNavbar() {
    console.log("  [Navbar Init] START: Beginning navbar initialization...");

    // 1. Inject the Navbar HTML. No more fetch! We use the imported string. This is synchronous and reliable.
    try {
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
        console.log("  [Navbar Init] SUCCESS: Navbar HTML has been injected into the DOM.");
    } catch (error) {
        console.error("  [Navbar Init] FATAL ERROR: Could not inject navbar HTML.", error);
        return; // Stop if we can't even inject the HTML
    }

    // 2. Find all the navbar elements now that they are guaranteed to be in the DOM.
    console.log("  [Navbar Init] ACTION: Querying for navbar elements by ID...");
    const navbar = document.getElementById('landing-navbar') as HTMLElement;
    const hamburgerBtn = document.getElementById('hamburger-btn') as HTMLButtonElement;
    const mobileMenu = document.getElementById('mobile-nav-menu') as HTMLElement;
    const desktopActionsDiv = document.getElementById('landing-navbar-actions') as HTMLElement;
    const mobileActionsDiv = document.getElementById('mobile-nav-actions') as HTMLElement;

    if (!navbar || !hamburgerBtn || !mobileMenu || !desktopActionsDiv || !mobileActionsDiv) {
        console.error("  [Navbar Init] FATAL ERROR: One or more essential navbar elements were NOT FOUND after injection. Check IDs in landing-navbar.html.", {
            navbarExists: !!navbar,
            hamburgerBtnExists: !!hamburgerBtn,
            mobileMenuExists: !!mobileMenu,
            desktopActionsDivExists: !!desktopActionsDiv,
            mobileActionsDivExists: !!mobileActionsDiv,
        });
        return;
    }
    console.log("  [Navbar Init] SUCCESS: All navbar elements found.");

    // 3. Set up core event listeners
    console.log("  [Navbar Init] ACTION: Attaching event listeners (click, scroll)...");
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        mobileMenu.classList.toggle('active');
    });

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    document.addEventListener('click', (event) => {
        if (mobileMenu.classList.contains('active')) {
            const isClickInsideMenu = mobileMenu.contains(event.target as Node);
            if (!isClickInsideMenu) {
                mobileMenu.classList.remove('active');
            }
        }
    });
    console.log("  [Navbar Init] SUCCESS: Event listeners attached.");

    // 4. Set up Auth-dependent buttons
    console.log("  [Navbar Init] ACTION: Setting up auth state listener for UI changes...");
    onAuthStateChanged(auth, (user: User | null) => {
        console.log(`  [Navbar Auth] State changed. User is ${user ? 'LOGGED IN' : 'LOGGED OUT'}.`);
        if (user) {
            const enterAppHtml = `<a href="/app.html">Enter App</a>`;
            desktopActionsDiv.innerHTML = enterAppHtml;
            mobileActionsDiv.innerHTML = enterAppHtml;
        } else {
            const signInHtml = `<a href="/">Sign In / Sign Up</a>`;
            desktopActionsDiv.innerHTML = signInHtml;
            mobileActionsDiv.innerHTML = signInHtml;
        }
        console.log("  [Navbar Auth] UI updated based on auth state.");
    });
    console.log("  [Navbar Init] COMPLETE: Navbar initialization finished.");
}


async function createUserProfileWithWhitelistCheck(user: User) {
  // This function remains the same
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
  // This config remains the same
  callbacks: {
    signInSuccessWithAuthResult: (authResult) => {
      createUserProfileWithWhitelistCheck(authResult.user).then(() => {
        window.location.assign('/app.html');
      });
      return false;
    },
    uiShown: () => { }
  },
  signInOptions: [GoogleAuthProvider.PROVIDER_ID, EmailAuthProvider.PROVIDER_ID],
  signInFlow: 'popup',
};

function initializeFirebaseUI() {
    console.log("  [FirebaseUI Init] START: Looking for auth container...");
    const authContainer = document.getElementById('firebaseui-auth-container');
    if (authContainer) {
        const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
        ui.start('#firebaseui-auth-container', uiConfig);
        console.log("  [FirebaseUI Init] SUCCESS: FirebaseUI started.");
    } else {
        console.warn("  [FirebaseUI Init] SKIPPED: Auth container not found on this page.");
    }
}

function setupCtaButtons() {
    console.log("  [CTA Buttons] START: Looking for CTA button...");
    const finalCtaButton = document.getElementById('final-cta-btn');
    const heroSection = document.querySelector('.hero-section');
    if (finalCtaButton && heroSection) {
        finalCtaButton.addEventListener('click', (e) => {
            e.preventDefault();
            heroSection.scrollIntoView({ behavior: 'smooth' });
        });
        console.log("  [CTA Buttons] SUCCESS: Click listener attached to final CTA button.");
    } else {
        console.warn("  [CTA Buttons] SKIPPED: Final CTA button or hero section not found.");
    }
}


// --- MAIN INITIALIZATION SEQUENCE ---
// This runs once the initial HTML document has been completely loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
  console.log("==================================================");
  console.log("🚀 DOM fully loaded. Starting initialization sequence...");
  console.log("==================================================");

  // --- Step 1: Initialize Navbar ---
  console.log("SEQUENCE: 1. Initializing Navbar...");
  try {
      initializeLandingPageNavbar();
      console.log("SEQUENCE: 1. ✅ Navbar Initialized SUCCESSFULLY.");
  } catch (error) {
      console.error("SEQUENCE: 1. ❌ FAILED to initialize Navbar.", error);
  }

  // --- Step 2: Initialize Firebase UI ---
  console.log("SEQUENCE: 2. Initializing FirebaseUI...");
  try {
      initializeFirebaseUI();
      console.log("SEQUENCE: 2. ✅ FirebaseUI Initialized SUCCESSFULLY.");
  } catch (error) {
      console.error("SEQUENCE: 2. ❌ FAILED to initialize FirebaseUI.", error);
  }

  // --- Step 3: Initialize Rosters and Carousels ---
  console.log("SEQUENCE: 3. Initializing Rosters & Carousels...");
  try {
      initializeRostersAndCarousels();
      console.log("SEQUENCE: 3. ✅ Rosters & Carousels Initialized SUCCESSFULLY.");
  } catch (error) {
      console.error("SEQUENCE: 3. ❌ FAILED to initialize Rosters & Carousels.", error);
  }

  // --- Step 4: Initialize Persona Modal ---
  console.log("SEQUENCE: 4. Initializing Persona Modal...");
  try {
      initializePersonaModal();
      console.log("SEQUENCE: 4. ✅ Persona Modal Initialized SUCCESSFULLY.");
  } catch (error) {
      console.error("SEQUENCE: 4. ❌ FAILED to initialize Persona Modal.", error);
  }
  
  // --- Step 5: Setup CTA Buttons ---
  console.log("SEQUENCE: 5. Setting up CTA buttons...");
  try {
      setupCtaButtons();
      console.log("SEQUENCE: 5. ✅ CTA buttons set up SUCCESSFULLY.");
  } catch(error) {
      console.error("SEQUENCE: 5. ❌ FAILED to set up CTA buttons.", error);
  }

  console.log("==================================================");
  console.log("🎉 Initialization sequence complete. Page is interactive.");
  console.log("==================================================");
});