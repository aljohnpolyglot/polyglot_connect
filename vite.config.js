// D:\polyglot_connect\vite.config.js
import { defineConfig } from 'vite';

// Helper function to construct the define object
// It will look for environment variables like GITHUB_ACTIONS_VITE_GEMINI_API_KEY
// (which we will set in the workflow) and create the define config for Vite.
const getDefineConfigFromEnv = () => {
  const defined = {};
  const keysToDefine = [
    'VITE_GEMINI_API_KEY',
    'VITE_GEMINI_API_KEY_ALT',
    'VITE_GEMINI_API_KEY_ALT_2',
    'VITE_GROQ_API_KEY',
    'VITE_TOGETHER_API_KEY',
    'VITE_TEST_VAR' // Keep the test var
  ];

  keysToDefine.forEach(key => {
    // Use a distinct prefix for env vars set in GitHub Actions for clarity
    const envVarName = `WORKFLOW_DEFINED_${key}`; 
    if (process.env[envVarName]) {
      // IMPORTANT: The value must be JSON.stringified because 'define' does direct replacement.
      // So, a string value "foobar" becomes "\"foobar\"" in the define object.
      defined[`import.meta.env.${key}`] = JSON.stringify(process.env[envVarName]);
      console.log(`vite.config.js: Defining import.meta.env.${key} from env var ${envVarName}`);
    } else {
      // Fallback if the env var isn't set during build (shouldn't happen with workflow)
      // For local dev, import.meta.env will still try to use .env file values.
      // This define block is primarily for the CI build.
      console.warn(`vite.config.js: Environment variable ${envVarName} not found for defining import.meta.env.${key}. Vite will rely on .env for this if in dev mode.`);
    }
  });
  return defined;
};

export default defineConfig({
  build: {
    outDir: 'dist', 
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html' 
      }
    }
  },
  base: '/polyglot_connect/',
  server: {
    open: true 
  },
  // Add the define block
  define: getDefineConfigFromEnv()
});