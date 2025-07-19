import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import * as path from 'path'; // ✅ Use 'node:path' for full TS compatibility

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ✅ Removed './' — not required in resolve
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Peshkash',
        short_name: 'Peshkash',
        theme_color: '#800000',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
