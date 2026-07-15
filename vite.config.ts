import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'StickerShot',
        short_name: 'StickerShot',
        description: '찍고, 모으고, 베어봐! 나만의 물건으로 만드는 스티커 액션 게임',
        theme_color: '#ff4f7b',
        background_color: '#fff8ec',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/opencv-*.js'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: /opencv-.*\.js$/,
          handler: 'CacheFirst',
          options: { cacheName: 'stickershot-vision-v1', expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 } }
        }]
      },
      devOptions: { enabled: true }
    })
  ],
  test: { environment: 'jsdom', globals: true }
}))
