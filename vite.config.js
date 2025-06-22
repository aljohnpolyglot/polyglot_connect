// vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // === ADD THIS SECTION ===
  optimizeDeps: {
    include: ['../data/whitelist.json'] // Or the correct relative path
  },
  // ========================
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html',
        pricing: 'pricing.html',
        dossier: 'dossier.html'
      },
    }
  },
  // === ADD THIS SECTION FOR JSON HANDLING IF NEEDED ===
  // json: {
  //   namedExports: true, // Allows import data from './file.json'
  //   stringify: false,   // If true, imports JSON as a string to be parsed
  // },
  // ===============================================
  base: '/',
  server: {
    open: true,
    https: true
  }
});