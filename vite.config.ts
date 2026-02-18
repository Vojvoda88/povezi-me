import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          // Proxy samo API backend rute (ne module poput /api.ts)
          '/api/': { target: 'http://localhost:3001', changeOrigin: true },
          '/health': { target: 'http://localhost:3001', changeOrigin: true },
          '/socket.io': { target: 'http://localhost:3001', ws: true },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2020',
        minify: 'esbuild',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'icons': ['lucide-react'],
            },
          },
        },
        chunkSizeWarningLimit: 600,
      },
    };
});
