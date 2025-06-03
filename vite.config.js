// D:\polyglot_connect\vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // 'root' is implicitly D:\polyglot_connect\ because this config is here.
  
  build: {
    // Output will be D:\polyglot_connect\dist\
    outDir: 'dist', 
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // 'main' is the key, 'index.html' is the path relative to this config's root
        main: 'index.html' 
      }
    }
  },

  // Base path for GitHub Pages.
  // Your NEW repo is named 'polyglot_connect'.
  // So the site will be at https://aljohnpolyglot.github.io/polyglot_connect/
  base: '/polyglot_connect/', //  <<<<<----- THIS IS CRITICAL /<repo-name>/

  server: {
    open: true // Opens D:\polyglot_connect\index.html via http://localhost:5173/
  }
});