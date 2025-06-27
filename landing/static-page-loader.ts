// D:\polyglot_connect\landing\static-page-loader.ts

import { getAuth, onAuthStateChanged } from "firebase/auth";

// This function will run on any page that includes this script
(async function initializeStaticPage() {
    // 1. Load and inject the navbar
    try {
        const response = await fetch('/landing/landing-navbar.html');
        if (!response.ok) throw new Error('Navbar HTML not found');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
    } catch (error) {
        console.error('Failed to load navbar:', error);
    }

    // 2. Add a simple, consistent footer
    const footerHtml = `
        <style>
            .static-footer {
                text-align: center;
                padding: 40px 20px;
                margin-top: 60px;
                border-top: 1px solid #333;
                color: #aaa;
                font-family: 'Roboto', sans-serif;
            }
            .static-footer a {
                color: #fff;
                text-decoration: none;
                margin: 0 10px;
            }
            .static-footer a:hover {
                text-decoration: underline;
            }
        </style>
        <footer class="static-footer">
            <p>© ${new Date().getFullYear()} Polyglot Connect. All Rights Reserved.</p>
            <p>
                <a href="/terms.html">Terms of Service</a> | 
                <a href="/privacy.html">Privacy Policy</a>
            </p>
        </footer>
    `;
    document.body.insertAdjacentHTML('beforeend', footerHtml);

    // 3. Make the navbar interactive
    setupNavbarInteractivity();
})();

function setupNavbarInteractivity() {
    const navbar = document.getElementById('landing-navbar');
    const actionsDiv = document.getElementById('landing-navbar-actions');
    
    if (!navbar || !actionsDiv) return;

    // Add the "scrolled" effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // We MUST initialize Firebase to use Auth.
    // This assumes your pricing.html will have the firebase-config setup.
    try {
        const auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is logged in, show 'Enter App' button
                actionsDiv.innerHTML = `<a href="/app.html">Enter App</a>`;
            } else {
                // User is logged out, show 'Sign In' button
                actionsDiv.innerHTML = `<a href="/#firebaseui-auth-container">Sign In</a>`;
            }
        });
    } catch (e) {
        // If Firebase isn't initialized on the page, hide the actions
        console.warn("Firebase not initialized on this page. Hiding user actions in navbar.");
        actionsDiv.style.display = 'none';
    }
}