import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite's dev server injects inline <style> and <script> tags (hot reload),
// which the strict CSP blocks. Relax the CSP in dev only; production keeps the strict one.
const devCsp = () => ({
  name: 'dev-csp',
  apply: 'serve',
  transformIndexHtml: (html) =>
    html
      .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
      .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'"),
});

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react(), devCsp()],
  server: { port: 5173, strictPort: true },
  build: { outDir: '../../dist/renderer', emptyOutDir: true },
});