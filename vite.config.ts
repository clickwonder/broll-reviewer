import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,  // Bind to all interfaces (0.0.0.0) for WSL2 access
    open: true,
    watch: {
      usePolling: true,
      interval: 500,
      ignored: ['**/public/scenes/**', '**/public/broll/**']
    },
    hmr: {
      overlay: true
    },
  }
});
