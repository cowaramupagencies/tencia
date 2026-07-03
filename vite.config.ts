import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project sites are served from https://user.github.io/REPO_NAME/
// Set VITE_BASE_PATH=/REPO_NAME/ when building for GitHub Pages.
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
});
