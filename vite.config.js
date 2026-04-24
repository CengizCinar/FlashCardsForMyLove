import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // sw-push.js'i workbox'un yanına ekle
      injectManifest: undefined,
      strategies: 'generateSW',
      manifest: {
        name: 'Woordenlijst',
        short_name: 'Woordenlijst',
        description: 'Hollandaca / Türkçe kelime ezber uygulaması',
        theme_color: '#232222ff',
        background_color: '#f5ede0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Push handler'ı SW'ye dahil et
        importScripts: ['/sw-push.js'],
        runtimeCaching: []
      }
    })
  ]
})