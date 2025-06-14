// D:\website\vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // Tell Vite to consider 'polyglot_connect' as the project root for dev server
  root: 'polyglot_connect', 
  
  // Build config can remain for when 'npm run build' is used
  build: {
    // Output will be relative to project root, so '../dist'
    // if 'root' is 'polyglot_connect'.
    // This means D:\website\dist\
    outDir: '../dist', 
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Path is now relative to the new 'root'
        main: 'index.html' 
      }
    }
  },

  // Base path for deployed assets. This depends on your final URL structure.
  // If URL is .../aljohnpolyglot/polyglot_connect/
  // AND GitHub Pages serves from gh-pages/(root)
  // AND your built app (from 'dist') is placed into 'polyglot_connect' on gh-pages
  // then base should be '/aljohnpolyglot/polyglot_connect/'
  //
  // However, if you set root: 'polyglot_connect', and your gh-pages serves
  // from gh-pages/(root) and your app is directly in that root (after build),
  // then base might be just '/aljohnpolyglot/' (if repo is aljohnpolyglot)
  //
  // Let's simplify base for now, assuming the build output from 'dist' will be
  // the ONLY thing deployed to the root of the gh-pages for this specific app.
  // This usually means your repo is dedicated to this app.
  // Given your site structure, this is tricky.
  //
  // For local dev with root: 'polyglot_connect', 'base' is less critical for server startup
  // but crucial for build.
  // Let's keep the previous base, assuming the build output will eventually go to that subpath.
  base: '/aljohnpolyglot/polyglot_connect/',

  server: {
    // 'open' is now relative to the new 'root'
    open: '/index.html' // This will open http://localhost:xxxx/index.html
                        // which will serve D:\website\polyglot_connect\index.html
  }
});