import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
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
