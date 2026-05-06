import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import commonjs from 'vite-plugin-commonjs'

// Generate a short build hash (7 characters, like git commit)
const generateBuildHash = () => {
  const timestamp = Date.now().toString();
  let hash = 0;
  for (let i = 0; i < timestamp.length; i++) {
    const char = timestamp.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 7);
};

const buildHash = generateBuildHash();
const buildTime = new Date().toISOString();

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  resolve: {
    // Enable symlink resolution for shared code from Lambda
    preserveSymlinks: true,
  },
  server: {
    watch: {
      // Ignore claude-flow directory to prevent reload when metrics are written
      ignored: ['**/.claude-flow/**']
    }
  },
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __SPELLCHECK_BASE_URL__: JSON.stringify(env.VITE_SPELLCHECK_API_BASE_URL ?? ''),
    __SPELLCHECK_API_KEY__: JSON.stringify(env.VITE_SPELLCHECK_API_KEY ?? ''),
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@aws-amplify') || id.includes('aws-amplify')) return 'vendor-amplify';
          if (id.includes('wavesurfer')) return 'vendor-wavesurfer';
          // Everything else (react, react-quill, quill, tanstack, zustand, etc.) goes into
          // a single vendor chunk. These packages have mutual import cycles that produce
          // circular chunk warnings when split further, and intra-chunk cycles are invisible
          // to Rollup.
          return 'vendor';
        },
      },
    },
  },
  plugins: [
    commonjs(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'icons/*.png'],
      manifest: {
        name: 'kiyânaw Transcribe',
        short_name: 'Transcribe',
        description: 'Indigenous Language Transcription Platform',
        theme_color: '#305880',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.amazonaws\.com\/.*/,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /.*appsync.*/,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /.*graphql.*/,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        offlineGoogleAnalytics: false,
        skipWaiting: true,
        clientsClaim: true,
        cacheId: `kiyanaw-${buildHash}`,
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false  // Disable service worker in dev to avoid conflicts
      }
    })
  ],
  };
})
