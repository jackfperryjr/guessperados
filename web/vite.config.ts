import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: { target: 'esnext' },
  plugins: [
    VitePWA({
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Friends Slay the Dragon',
        short_name: 'Friends Slay the Dragon',
        description: 'Friends Slay the Dragon — local co-op action for 2+ players',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,ogg,mp3,wav}']
      }
    })
  ]
})
