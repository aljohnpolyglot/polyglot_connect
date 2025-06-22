// D:\polyglot_connect\vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl'; // <<< ADD THIS IMPORT
import path from 'path'; // <<< ADD THIS LINE

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html' // This is your main application page
      }
    }
  },
  base: '/', // <<< CHANGE THIS TO '/' FOR FIREBASE HOSTING
  server: {
    open: true,
    https: true
  }
});