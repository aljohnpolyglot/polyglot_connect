// D:\polyglot_connect\js\config.js
console.log("polyglot_connect/js/config.js: Attempting to export API keys from Vite env...");

console.log("polyglot_connect/js/config.js: VITE_TEST_VAR from import.meta.env =", import.meta.env.VITE_TEST_VAR);

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const GEMINI_API_KEY_ALT = import.meta.env.VITE_GEMINI_API_KEY_ALT;
export const GEMINI_API_KEY_ALT_2 = import.meta.env.VITE_GEMINI_API_KEY_ALT_2;
export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
export const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;

if (GEMINI_API_KEY) console.log("config.js: GEMINI_API_KEY is ready for export."); else console.warn("config.js: VITE_GEMINI_API_KEY was not injected or is undefined.");
if (GEMINI_API_KEY_ALT) console.log("config.js: GEMINI_API_KEY_ALT is ready for export."); else console.warn("config.js: VITE_GEMINI_API_KEY_ALT was not injected or is undefined.");
if (GEMINI_API_KEY_ALT_2) console.log("config.js: GEMINI_API_KEY_ALT_2 is ready for export."); else console.warn("config.js: VITE_GEMINI_API_KEY_ALT_2 was not injected or is undefined.");
if (GROQ_API_KEY) console.log("config.js: GROQ_API_KEY is ready for export."); else console.warn("config.js: VITE_GROQ_API_KEY was not injected or is undefined.");
if (TOGETHER_API_KEY) console.log("config.js: TOGETHER_API_KEY is ready for export."); else console.warn("config.js: VITE_TOGETHER_API_KEY was not injected or is undefined.");