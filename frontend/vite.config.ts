import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      // En dev también se inyectan manifest y Service Worker: sin esto,
      // /manifest.webmanifest cae en el SPA fallback y Chrome muestra
      // "Manifest: Syntax error" en la consola de desarrollo.
      devOptions: { enabled: true },
      includeAssets: ['logo-radio.png'],
      manifest: {
        name: 'Radiometro',
        short_name: 'Radiometro',
        description: 'Reproductor de radio online',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Rutas que NUNCA se cachean:
            // - auth/favorites: Workbox identifica la caché solo por URL e
            //   ignora la cabecera Authorization; con NetworkFirst los
            //   favoritos/GET de auth de un usuario podían servirse a otro
            //   tras cerrar sesión (fuga de privacidad en el mismo navegador).
            // - proxy-stream: respuestas de audio infinitas; cache.put() sobre
            //   un stream falla (Cache.put network error) y NetworkFirst
            //   respondía no-response al <audio>, rompiendo la reproducción.
            // Ojo: se llaman SIN barra final -> el patrón debe cubrir
            // '/api/x', '/api/x?query' y '/api/x/<id>'.
            urlPattern: /^https?:\/\/.*\/api\/(auth|favorites|proxy-stream)(\/|\?|$)/i,
            handler: 'NetworkOnly',
          },
          {
            // El resto de la API (p.ej. búsquedas de emisoras, datos públicos)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-v2',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})