// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'peshkash-loader',
        },
      },
    }),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      filename: 'peshkash-sw.js',
      manifest: false,
      workbox: {
        importScripts: ['/peshkash-push-sw.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Keep the install/update payload to the app shell. Editorial images and
        // downloadable brochures are cached only when the user actually opens them.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2,ico}'],
        globIgnores: ['resources/**/*'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'peshkash-images-v1',
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'peshkash-fonts-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 180 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'classic',
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
