/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons.svg', 'lumalogo.jpg'],
      manifest: {
        name: 'Salones PWA',
        short_name: 'Salones',
        description: 'Aplicación PWA para gestión de salones de belleza',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#8b5cf6',
        icons: [
          {
            src: '/lumalogo.jpg',
            sizes: 'any',
            type: 'image/jpeg',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/(rest\/v1|rpc\/v1)\/.*/i,
            // Avoid stale financial/transaction data in production.
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https?:\/\/.*\/storage\/v1\/object\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: /^https?:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|gif|webp|avif|ico|svg)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
})
