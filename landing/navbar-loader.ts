// D:\polyglot_connect\landing\navbar-loader.ts

import { initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Vite can read these from your .env file
const firebaseConfig = {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    authDomain: "polyglot-connect-ffdcc.firebaseapp.com",
    projectId: "polyglot-connect-ffdcc",
    storageBucket: "polyglot-connect-ffdcc.appspot.com",
    messagingSenderId: "367332280854",
    appId: "1:367332280854:web:6513364f7b63f53331b058"
};

// --- Main Execution ---
// We create a single promise that the rest of the app can rely on.
const navbarReadyPromise = new Promise<void>((resolve, reject) => {
    const init = async () => {
        try {
            const response = await fetch('/landing/landing-navbar.html');
            if (!response.ok) throw new Error('Navbar HTML not found');
            const navbarHtml = await response.text();
            document.body.insertAdjacentHTML('afterbegin', navbarHtml);
            
            // Navbar is now in the DOM. Set up its logic.
            setupNavbarInteractivity();
            
            // Resolve the promise to signal completion.
            resolve();
        } catch (error) {
            console.error('CRITICAL: Failed to load navbar.', error);
            reject(error);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
});


function setupNavbarInteractivity() {
    // This function now runs with the guarantee that the navbar HTML is present.
    const navbar = document.getElementById('landing-navbar');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-nav-menu');
    const desktopActionsDiv = document.getElementById('landing-navbar-actions');
    const mobileActionsDiv = document.getElementById('mobile-nav-actions');

    if (!navbar || !hamburgerBtn || !mobileMenu || !desktopActionsDiv || !mobileActionsDiv) {
        console.error("Navbar interactive elements could not be found after injection.");
        return;
    }
    
    // --- Initialize Firebase Auth ---
    let app: FirebaseApp;
    try { app = getApp(); } catch (e) { app = initializeApp(firebaseConfig); }
    const auth = getAuth(app);

    // --- Event Listeners ---
    hamburgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('active'));
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));
    
    onAuthStateChanged(auth, (user) => {
        const actionHtml = user ? `<a href="/app.html">Enter App</a>` : `<a href="/">Sign In</a>`;
        desktopActionsDiv.innerHTML = actionHtml;
        mobileActionsDiv.innerHTML = actionHtml;
    });
}