// D:\polyglot_connect\js\global-setup.js

// Import flagLoader as a module, its exports will be in flagLoaderModule
import * as flagLoaderModule from './utils/flagcdn'; // Path from src/js/ to src/js/utils/

// Import helpers.ts ONLY for its side effects.
// This means the helpers.ts script will run. Since helpers.ts assigns
// itself to window.polyglotHelpers, we don't need to do anything further with an import variable.
import './utils/helpers';

// --- Setup flagLoader ---
// Assign the imported module (which contains the exported functions from flagcdn.ts)
// to the window object.
window.flagLoader = flagLoaderModule;
console.log("global-setup.js: window.flagLoader has been set:", window.flagLoader);

// Dispatch an event to let other modules know that flagLoader is ready.
document.dispatchEvent(new CustomEvent('flagLoaderReady'));
console.log("global-setup.js: 'flagLoaderReady' event dispatched.");

// --- Setup polyglotHelpers ---
// We DO NOT re-assign window.polyglotHelpers here because helpers.ts
// (imported above for its side effects) already performs this assignment internally.
// Overwriting it here was the cause of the previous issue.

// For debugging, let's log what helpers.ts put on the window.
// This should be an object with methods like loadFromLocalStorage, etc.,
// NOT a "Module { ... }" object.
console.log("global-setup.js: Confirming window.polyglotHelpers (should be set by helpers.ts):", window.polyglotHelpers);

// Dispatch an event to let other modules know that polyglotHelpers is ready.
// Other modules should now find the correct object on window.polyglotHelpers.
document.dispatchEvent(new CustomEvent('polyglotHelpersReady'));
console.log("global-setup.js: 'polyglotHelpersReady' event dispatched.");

// You can add other global setup tasks here if needed.