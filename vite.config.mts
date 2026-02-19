import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api/': { target: 'http://localhost:3001', changeOrigin: true },
        '/health': { target: 'http://localhost:3001', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:3001', ws: true },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo-full.png', 'icon-512.png'],
        manifest: {
          name: 'Poveži.ME - Premium Marketplace',
          short_name: 'Poveži.ME',
          description: 'Kupuj i prodaj brzo i sigurno u Crnoj Gori. Automobili, nekretnine, tehnika i još mnogo toga.',
          theme_color: '#4F6DFF',
          background_color: '#0B1220',
          display: 'standalone',
          start_url: '/',
          lang: 'sr-Latn',
          icons: [
            { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
            { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
            { src: '/icon-512.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'tailwind-cdn', expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
            {
              urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            icons: ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
