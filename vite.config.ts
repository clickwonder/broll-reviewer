import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    open: true,
    watch: {
      usePolling: false,
      ignored: ['**/public/scenes/**', '**/public/broll/**']
    },
    proxy: {
      '/api/pexels': {
        target: 'https://api.pexels.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pexels/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // The Authorization header will be set by the client
          });
        }
      },
      '/api/pixabay': {
        target: 'https://pixabay.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pixabay/, '')
      }
    }
  }
});
