// D:\polyglot_connect\vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl'; // <<< ADD THIS IMPORT

export default defineConfig({
  plugins: [ // <<< ADD PLUGINS ARRAY IF NOT PRESENT
    basicSsl() // <<< ADD THE SSL PLUGIN
  ],
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
    open: true,
    https: true // <<< ENABLE HTTPS
    // You can optionally specify a port if needed, e.g., port: 3000 or 5173
    // host: true, // Optional: if you want to access it from other devices on your network
  }
});