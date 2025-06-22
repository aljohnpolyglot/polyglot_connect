// landing/landing.ts

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import * as firebaseui from 'firebaseui';

// --- START: ADD THIS BLOCK ---
// The secret "backdoor" function
(window as any).enterScreenshotMode = (secretCode: string) => {
    if (secretCode === "polyglotDev2024") { // Your secret password
        sessionStorage.setItem("dev_override", "true");
        console.log("%cScreenshot mode activated. Navigating to app.html...", "color: lime; font-weight: bold; font-size: 16px;");
        // Instead of reloading, we now navigate directly to the app page
        window.location.href = '/app.html'; 
    } else {
        console.error("Incorrect secret code.");
    }
};
console.log("%cDev Tip: To bypass login for screenshots, type enterScreenshotMode('your_secret_code') in the console.", "color: orange;");
// --- END: ADD THIS BLOCK ---


document.addEventListener('DOMContentLoaded', function() {
    // --- FirebaseUI Initialization ---
    const firebaseConfig = {
        apiKey: "AIzaSyC5k_WocF2E9fJ_rYiUVw-hUq5UYfF1QxI",
        authDomain: "polyglot-connect-ffdcc.firebaseapp.com",
        projectId: "polyglot-connect-ffdcc",
        storageBucket: "polyglot-connect-ffdcc.appspot.com",
        messagingSenderId: "724893488450",
        appId: "1:724893488450:web:51b944b94a7c66e3fbe4db",
        measurementId: "G-CQR8RBH78K"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // FirebaseUI config
    const uiConfig: firebaseui.auth.Config = {
      signInSuccessUrl: '/app.html',
      signInOptions: [
        GoogleAuthProvider.PROVIDER_ID,
        EmailAuthProvider.PROVIDER_ID
      ]
      // Since we don't have these pages yet, we just omit the properties.
    };
    // Initialize the FirebaseUI Widget and render it
    const ui = new firebaseui.auth.AuthUI(auth); // Use the modular auth instance
    ui.start('#firebaseui-auth-container', uiConfig);

    // --- Smooth Scroll for final CTA button ---
    const finalCtaButton = document.getElementById('final-cta-btn');
    const heroSection = document.querySelector('.hero-section');

    if (finalCtaButton && heroSection) {
        finalCtaButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Since heroSection is an Element, we need to assert it has scrollIntoView
            (heroSection as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        });
    }
});