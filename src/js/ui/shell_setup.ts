// D:\polyglot_connect\src\js\ui\shell_setup.ts
// This file initializes the entire Polyglot Connect application.
// It waits for core dependencies to be ready and then calls
// initializeAppCore() to set up the UI and the AI services.

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers // Use alias if PolyglotHelpers is also a module name
} from '../types/global.d.ts'; // Path from src/js/ui to src/js/types

console.log('shell_setup.ts: Script loaded, waiting for core dependencies.');

// Define the interface for the module this IIFE will produce
interface ShellSetupModule {
    initializeAppCore: () => boolean;
}

function initializeActualShellSetup(): void {
    console.log('shell_setup.ts: initializeActualShellSetup() called.');

    if (!window.domElements || !window.polyglotHelpers) {
        console.error("shell_setup.ts: CRITICAL - domElements or polyglotHelpers not ready for ShellSetup initialization. Halting ShellSetup.");
        // Set a dummy object to prevent errors if app.js tries to call it
        window.shellSetup = {
            initializeAppCore: () => {
                console.error("ShellSetup not initialized (deps missing).");
                document.body.innerHTML = "<p style='text-align:center; padding:20px; color:red;'>Core UI Shell Setup Error due to missing dependencies. Check console.</p>";
                return false;
            }
        };
        return;
    }
    console.log('shell_setup.ts: Core dependencies (domElements, polyglotHelpers) appear ready.');

    window.shellSetup = ((): ShellSetupModule => {
        'use strict';

        // Get dependencies with type casting
        const getDeps = () => ({
            domElements: window.domElements as YourDomElements, // Should be defined due to outer check
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers // Should be defined
        });

        function initializeAppCore(): boolean {
            const { domElements } = getDeps(); // polyglotHelpers not directly used by this func but by its callees
            console.log("shellSetup.ts: initializeAppCore - Starting core shell initialization.");

            if (!domElements?.appShell) {
                console.error("shellSetup.ts: initializeAppCore - CRITICAL: App shell container (domElements.appShell) not found!");
                document.body.innerHTML = "<p style='text-align:center; padding:20px; color:red;'>Core UI Shell Error. Check console.</p>";
                return false;
            }

            initializeTheme();
            setupCoreEventListeners();

            console.log("shellSetup.ts: initializeAppCore - Core shell setup complete.");
            return true;
        }

        function setupCoreEventListeners(): void {
            const { domElements } = getDeps();
            if (!domElements?.themeToggleButton) { // domElements itself is checked by initializeActualShellSetup
                console.warn("shellSetup.ts: Theme toggle button not found in domElements.");
                return;
            }
            domElements.themeToggleButton.addEventListener('click', toggleTheme);
            console.log("shellSetup.ts: Theme toggle listener attached.");
        }

        function initializeTheme(): void {
            const { domElements, polyglotHelpers } = getDeps();
            // domElements and polyglotHelpers are checked by initializeActualShellSetup

            const savedTheme = polyglotHelpers.loadFromLocalStorage('polyglotConnectTheme') as string || 'light';
            document.body.classList.toggle('dark-mode', savedTheme === 'dark');

            const themeButton = domElements.themeToggleButton as HTMLButtonElement | null; // Cast
            if (themeButton) {
                themeButton.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                themeButton.setAttribute('aria-label', savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            }
            console.log("shellSetup.ts: Theme initialized to", savedTheme);
        }

        function toggleTheme(): void {
            const { domElements, polyglotHelpers } = getDeps();
            // domElements and polyglotHelpers are checked by initializeActualShellSetup

            document.body.classList.toggle('dark-mode');
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            polyglotHelpers.saveToLocalStorage('polyglotConnectTheme', currentTheme);

            const themeButton = domElements.themeToggleButton as HTMLButtonElement | null; // Cast
            if (themeButton) {
                themeButton.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                themeButton.setAttribute('aria-label', currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            }
            console.log("shellSetup.ts: Theme toggled to", currentTheme);
        }

        console.log("js/ui/shell_setup.ts: IIFE finished, returning exports.");
        return {
            initializeAppCore,
        };
    })(); // End of IIFE

  if (window.shellSetup && typeof window.shellSetup.initializeAppCore === 'function') {
        console.log("shell_setup.ts: SUCCESSFULLY assigned to window.shellSetup.");
        // Dispatch the ready event now that the module is fully functional
        document.dispatchEvent(new CustomEvent('shellSetupReady'));
        console.log('shell_setup.ts: "shellSetupReady" event dispatched.');
    } else {
        console.error("shell_setup.ts: CRITICAL ERROR - window.shellSetup assignment FAILED or method missing.");
    }

} // End of initializeActualShellSetup

// Wait for domElements and polyglotHelpers to be ready
const dependenciesNeededForShellSetup = ['domElementsReady', 'polyglotHelpersReady'];
let shellSetupDepsMet = 0;

function checkAndInitShellSetup() {
    shellSetupDepsMet++;
    if (shellSetupDepsMet === dependenciesNeededForShellSetup.length) {
        console.log('shell_setup.ts: All dependencies met. Initializing actual shell setup.');
        initializeActualShellSetup();
        dependenciesNeededForShellSetup.forEach(eventName => {
             document.removeEventListener(eventName, checkAndInitShellSetup);
        });
    }
}

if (window.domElements && window.polyglotHelpers) {
    console.log('shell_setup.ts: domElements & polyglotHelpers already available. Initializing actual shell setup directly.');
    initializeActualShellSetup();
} else {
    console.log('shell_setup.ts: Waiting for domElementsReady and polyglotHelpersReady events.');
    dependenciesNeededForShellSetup.forEach(eventName => {
        let alreadySet = false;
        if (eventName === 'domElementsReady' && window.domElements) alreadySet = true;
        if (eventName === 'polyglotHelpersReady' && window.polyglotHelpers) alreadySet = true;

        if (alreadySet) {
            console.log(`shell_setup.ts: Dependency for '${eventName}' already met.`);
            checkAndInitShellSetup();
        } else {
            document.addEventListener(eventName, checkAndInitShellSetup, { once: true });
        }
    });
}

console.log("js/ui/shell_setup.ts: Script execution finished. Initialization is event-driven or direct.");