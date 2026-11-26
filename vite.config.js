import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under any repository name.
export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
