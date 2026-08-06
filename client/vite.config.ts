/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  build: {
    rollupOptions: {
    }
  },
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // 'prompt': el SW nuevo queda en espera y la app muestra el banner
      // "Nueva versión disponible" en vez de recargar por su cuenta.
      registerType: 'prompt',
      // Con strategies: 'injectManifest' solo se aplica este bloque; la clave
      // `workbox` se ignora, así que el globPatterns tiene que vivir aquí.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      includeAssets: [
        'lumalogo.jpg',
        'icon-192.png',
        'icon-512.png',
        'icon-180.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png',
      ],
      manifest: {
        name: 'Salones',
        short_name: 'Salones',
        description: 'Gestión de salones de belleza',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#8b5cf6',
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
          // Maskable aparte: Android recorta el icono en círculo/squircle y el
          // wordmark a sangre se perdería. Estos llevan el logo dentro del 80%
          // central (zona segura) sobre fondo opaco.
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
