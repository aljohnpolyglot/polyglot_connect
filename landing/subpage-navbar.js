// /landing/subpage-navbar.js
// FINAL VERSION - Handles all navbar interactivity for sub-pages.

document.addEventListener('DOMContentLoaded', () => {
    console.log("Subpage Navbar Script: DOM loaded. Initializing...");

    // --- PART 1: Find all necessary elements ---
    const navbar = document.getElementById('landing-navbar');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-nav-menu');
    const desktopActions = document.getElementById('landing-navbar-actions'); // For desktop button
    const mobileActions = document.getElementById('mobile-nav-actions');   // For mobile menu button

    // Safety check - this should now pass since you added the HTML.
    if (!navbar || !hamburgerBtn || !mobileMenu || !desktopActions || !mobileActions) {
        console.error("Subpage Navbar Script: FATAL - One or more navbar elements not found. Check that the `landing-navbar-actions` and `mobile-nav-actions` divs were added to the HTML.");
        return;
    }
    console.log("Subpage Navbar Script: All elements found successfully.");

    // --- PART 2: Hamburger & Core Interactivity ---
    // This is the same as before and works.
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('active');
    });

    document.addEventListener('click', (event) => {
        if (mobileMenu.classList.contains('active')) {
            if (!mobileMenu.contains(event.target)) {
                mobileMenu.classList.remove('active');
            }
        }
    });

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
    console.log("Subpage Navbar Script: Core listeners (hamburger, scroll) attached.");

    // --- PART 3: Auth Logic to Populate Buttons ---
    // This now targets BOTH the desktop and mobile containers.
    function updateUserUI(user) {
        let actionHtml = '';
        if (user) {
            console.log("Subpage Navbar Script: Auth state is LOGGED IN.");
            // User is logged in, show "Enter App" button.
            actionHtml = `<a href="/app.html">Enter App</a>`;
        } else {
            console.log("Subpage Navbar Script: Auth state is LOGGED OUT.");
            // User is logged out, show "Sign In / Sign Up" button.
            // On sub-pages, this should link back to the main page's sign-in area.
            actionHtml = `<a href="/#firebaseui-auth-container">Sign In / Sign Up</a>`;
        }

        // Populate BOTH containers. CSS will handle showing/hiding them.
        desktopActions.innerHTML = actionHtml;
        mobileActions.innerHTML = actionHtml;
        console.log("Subpage Navbar Script: Desktop and Mobile action buttons updated.");
    }

    // --- PART 4: Initialize Firebase Connection ---
    // This will connect to the Firebase instance you already have on the page.
    try {
        console.log("Subpage Navbar Script: Attempting to connect to Firebase Auth...");
        // Dynamically import what we need from the Firebase SDK
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
            .then(({ getAuth, onAuthStateChanged }) => {
                const auth = getAuth();
                console.log("Subpage Navbar Script: Firebase Auth instance found. Setting up listener...");
                
                // Set up the listener that will call our UI update function
                onAuthStateChanged(auth, updateUserUI);
            })
            .catch(error => {
                console.error("Subpage Navbar Script: FAILED to load Firebase Auth module. Buttons will not update.", error);
                // Even if Firebase fails, show the "Sign In" button as a fallback.
                updateUserUI(null);
            });
    } catch (e) {
        console.error("Subpage Navbar Script: CRITICAL - Could not initialize auth logic. Is the main Firebase config on this page?", e);
    }

    console.log("Subpage Navbar Script: Initialization sequence finished.");
});