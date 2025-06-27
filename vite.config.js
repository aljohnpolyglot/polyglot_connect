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
    https: true, // Keep this
    host: true, // <--- ADD THIS LINE
    proxy: {
      '/api/imgur': { // This is a prefix you choose for your proxy path
        target: 'https://api.imgur.com', // The actual API target
        changeOrigin: true, // Important for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api\/imgur/, ''), // Remove your prefix before forwarding
        configure: (proxy, options) => { // Optional: for logging proxy activity
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] Sending to Imgur: ${proxyReq.method} ${proxyReq.path}`);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] Error:', err);
          });
        }
      }
    }
  }
});