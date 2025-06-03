// D:\polyglot_connect\vite.config.js
import { defineConfig } from 'vite';

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
  base: '/polyglot_connect/', // Since your repo is named 'polyglot_connect'
  server: {
    open: true 
  }
});