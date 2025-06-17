// D:\polyglot_connect\vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY_ALT?: string;
  readonly VITE_GEMINI_API_KEY_ALT_2?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_TOGETHER_API_KEY?: string;
  readonly VITE_OPEN_ROUTER_API_KEY?: string;
  readonly VITE_TEST_VAR?: string;
  // Add any other VITE_ variables you use here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}