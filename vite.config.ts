// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => {
  const isDevServer = command === 'serve'
  return ({
  plugins: [
    {
      name: 'retire-production-service-worker-in-dev',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/peshkash-sw.js', (_req, res) => {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Cache-Control', 'no-store')
          res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))),self.registration.unregister()]).then(()=>self.clients.claim())));")
        })
      },
      transformIndexHtml() {
        return [{
          tag: 'script',
          injectTo: 'head-prepend',
          children: `(async()=>{if(!('serviceWorker'in navigator))return;const registrations=await navigator.serviceWorker.getRegistrations();const controlled=Boolean(navigator.serviceWorker.controller);await Promise.all(registrations.map(registration=>registration.unregister()));if('caches'in window)await Promise.all((await caches.keys()).map(key=>caches.delete(key)));const reloadKey='peshkash-dev-sw-cleared';if(controlled&&!sessionStorage.getItem(reloadKey)){sessionStorage.setItem(reloadKey,'1');location.reload();return}if(!controlled)sessionStorage.removeItem(reloadKey)})().catch(()=>{});`,
        }]
      },
    },
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'peshkash-loader',
        },
      },
    }),
    VitePWA({
      strategies: 'generateSW',
      // Install updates in the background, but activate them on the next app
      // launch. Activating immediately can reload a live OTP form mid-request.
      registerType: isDevServer ? 'autoUpdate' : 'prompt',
      filename: 'peshkash-sw.js',
      manifest: false,
      workbox: {
        importScripts: ['/peshkash-push-sw.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: isDevServer,
        skipWaiting: isDevServer,
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
        // A generated worker during Vite development can cache an obsolete app
        // shell and leave localhost blank after HMR. Production remains enabled.
        enabled: false,
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
})
