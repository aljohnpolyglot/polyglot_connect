// js/ui/shell_setup.js
// Handles core application shell setup, theme, and global UI elements.

window.shellSetup = (() => {
    // Simpler getDeps for core shell elements and helpers
    const getDeps = () => ({
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        // Note: We might not need all dependencies from the original shell_controller here
        // For example, viewManager or chatManager will be called by app.js or view_manager.js directly.
    });

    function initializeAppCore() {
        const { domElements, polyglotHelpers } = getDeps();
        console.log("shellSetup: initializeAppCore - Starting core shell initialization.");

        if (!domElements?.appShell) {
            console.error("shellSetup: initializeAppCore - CRITICAL: App shell container (domElements.appShell) not found!");
            // Display a more user-friendly error if possible, or halt further UI init.
            document.body.innerHTML = "<p style='text-align:center; padding:20px; color:red;'>Core UI Shell Error. Check console.</p>";
            return false; // Indicate failure
        }

        initializeTheme(); // Set up the theme (light/dark)
        setupCoreEventListeners(); // Set up theme toggle listener

        console.log("shellSetup: initializeAppCore - Core shell setup complete.");
        return true; // Indicate success
    }

    function setupCoreEventListeners() {
        const { domElements } = getDeps();
        if (!domElements) {
            console.warn("shellSetup: setupCoreEventListeners - domElements not available.");
            return;
        }

        // Theme toggle button
        if (domElements.themeToggleButton) {
            domElements.themeToggleButton.addEventListener('click', toggleTheme);
            console.log("shellSetup: Theme toggle listener attached.");
        } else {
            console.warn("shellSetup: Theme toggle button not found in domElements.");
        }

        // Other global listeners that are purely shell-related could go here.
        // Main navigation tab clicks will be handled by view_manager.js
    }

    function initializeTheme() {
        const { domElements, polyglotHelpers } = getDeps();
        if (!domElements || !polyglotHelpers) {
            console.warn("shellSetup: initializeTheme - domElements or polyglotHelpers not available.");
            return;
        }
        const savedTheme = polyglotHelpers.loadFromLocalStorage('polyglotConnectTheme') || 'light';
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        if (domElements.themeToggleButton) {
            domElements.themeToggleButton.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            domElements.themeToggleButton.setAttribute('aria-label', savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
        console.log("shellSetup: Theme initialized to", savedTheme);
    }

    function toggleTheme() {
        const { domElements, polyglotHelpers } = getDeps();
        if (!domElements || !polyglotHelpers) {
            console.warn("shellSetup: toggleTheme - domElements or polyglotHelpers not available.");
            return;
        }
        document.body.classList.toggle('dark-mode');
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        polyglotHelpers.saveToLocalStorage('polyglotConnectTheme', currentTheme);
        if (domElements.themeToggleButton) {
            domElements.themeToggleButton.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            domElements.themeToggleButton.setAttribute('aria-label', currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
        console.log("shellSetup: Theme toggled to", currentTheme);
    }

    console.log("js/ui/shell_setup.js loaded.");
    return {
        initializeAppCore,
        // We don't need to expose initializeTheme or toggleTheme if initializeAppCore calls them.
        // setupCoreEventListeners is also internal to initializeAppCore.
    };
})();