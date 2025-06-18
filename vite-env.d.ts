// D:\polyglot_connect\vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // --- Other Providers ---
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_TOGETHER_API_KEY?: string;
  readonly VITE_OPEN_ROUTER_API_KEY?: string;
  
  // --- All 11 Gemini Keys ---
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY_ALT?: string;
  readonly VITE_GEMINI_API_KEY_ALT_2?: string;
  readonly VITE_GEMINI_API_KEY_ALT_3?: string;
  readonly VITE_GEMINI_API_KEY_ALT_4?: string;
  readonly VITE_GEMINI_API_KEY_ALT_5?: string;
  readonly VITE_GEMINI_API_KEY_ALT_6?: string;
  readonly VITE_GEMINI_API_KEY_ALT_7?: string;
  readonly VITE_GEMINI_API_KEY_ALT_8?: string;
  readonly VITE_GEMINI_API_KEY_ALT_9?: string;
  readonly VITE_GEMINI_API_KEY_ALT_10?: string;

  // Test Variable
  readonly VITE_TEST_VAR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}