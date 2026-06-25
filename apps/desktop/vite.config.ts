import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed dev port and leaves the console alone so its own
// output stays readable. See https://tauri.app for the conventions.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    // No sourcemaps in the shipped bundle: they would otherwise be packaged into the
    // installer and ship the full source. Use a dev build or DEVTOOLS for debugging.
    sourcemap: false,
  },
});
