import { defineConfig } from 'vite';

// Relative base works for GitHub project Pages and local preview.
// Override with GITHUB_PAGES_BASE=/repo-name/ when deploying to a project site.
export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE || './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    host: true,
  },
});
