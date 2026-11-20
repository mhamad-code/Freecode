import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { env: Record<string, string | undefined> };
const previewHost = process.env.PREVIEW_HOST;
// GitHub Pages serves project sites from /<repo>/. CI sets BASE_PATH for that.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Only the current preview host is trusted; localhost stays allowed by Vite.
    allowedHosts: previewHost ? [previewHost] : [],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: previewHost ? [previewHost] : [],
  },
});
