import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 相对路径部署，适合 GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});