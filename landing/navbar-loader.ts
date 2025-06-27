// D:\polyglot_connect\landing\navbar-loader.ts

// We need to import these functions to talk to Firebase Auth
import { initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- START: Firebase Initialization ---
// This code safely initializes Firebase ONCE, even if the script is loaded on multiple pages.
let app: FirebaseApp;
try {
    // This will work if Firebase has already been initialized (e.g., by landing.ts)
    app = getApp();
} catch (e) {
    // If it hasn't, we initialize it here.
    // This is crucial for pages like pricing.html that don't have their own init script.
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY", // Replace with your actual config
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };
    app = initializeApp(firebaseConfig);
}
const auth = getAuth(app);
// --- END: Firebase Initialization ---


// This function will run automatically as soon as the script is loaded
(async function initializeStaticPageNavbar() {
    // Wait for the DOM to be ready before trying to add anything
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

async function run() {
    // 1. Load and inject the navbar
    try {
        const response = await fetch('/landing/landing-navbar.html');
        if (!response.ok) throw new Error('Navbar HTML not found');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
    } catch (error) {
        console.error('Failed to load navbar:', error);
        return; // Stop if the navbar can't be loaded
    }

    // 2. Make the navbar interactive
    setupNavbarInteractivity();
}


function setupNavbarInteractivity() {
    const navbar = document.getElementById('landing-navbar');
    const actionsDiv = document.getElementById('landing-navbar-actions');
    
    if (!navbar || !actionsDiv) {
        console.warn("Could not find navbar elements to make interactive.");
        return;
    }

    // Add the "scrolled" effect for visual flair
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Listen for the user's login state and update the button
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is logged in, show a direct link to the application
            actionsDiv.innerHTML = `<a href="/app.html">Enter App</a>`;
        } else {
            // User is logged out, show a link to the landing page, which is the sign-in page.
            actionsDiv.innerHTML = `<a href="/">Sign In</a>`;
        }
    });
}