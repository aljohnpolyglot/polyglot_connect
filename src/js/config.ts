// D:\polyglot_connect\js\config.ts
console.log("polyglot_connect/js/config.ts: Attempting to export API keys from Vite env...");

// Vite provides types for import.meta.env by default if you have `vite/client.d.ts`
// referenced (usually implicitly via tsconfig if using Vite).
// Otherwise, you might need to declare them or ensure Vite's client types are active.
// For now, let's assume Vite's default typing for import.meta.env will work.
// If not, we can add a custom declaration for ImportMetaEnv.

console.log(
  "polyglot_connect/js/config.ts: VITE_TEST_VAR from import.meta.env =",
  import.meta.env.VITE_TEST_VAR
);
// This file is now obsolete for API keys, as they are loaded
// directly by the service modules from import.meta.env.
// It can be removed or kept for other configuration later.

console.log("config.ts: Loaded (API key logic is now in service modules).");

export {}; // Keep it as a module

console.log("polyglot_connect/js/config.ts: API key exports defined.");