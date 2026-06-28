import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: '健康监测助手',
        short_name: '健康助手',
        description: '患者用药与体征监测系统',
        theme_color: '#1989fa',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['medical', 'health'],
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icons/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\.(js|css|svg|png|jpg|jpeg|gif|ico|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
