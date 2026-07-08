import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX transform — no need for React import in every file
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Reduce chunk warning threshold
    chunkSizeWarningLimit: 800,
    cssMinify: true,
    // esbuild is faster and robust — keep for production
    minify: 'esbuild',
    // Target modern browsers to reduce polyfill overhead
    target: ['es2020', 'chrome87', 'firefox78', 'safari14'],
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching & parallel loading
        manualChunks: {
          // Core React runtime — rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Framer Motion — large, isolated so it doesn't bloat the main bundle
          'vendor-motion': ['framer-motion'],
          // Mermaid is very large (~2MB) — defer it completely
          'vendor-mermaid': ['mermaid'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Radix UI primitives
          'vendor-radix': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-icons',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
          ],
          // State management
          'vendor-state': ['zustand', '@tanstack/react-query'],
          // Scroll & animation utilities (lighter)
          'vendor-scroll': ['lenis', 'gsap'],
          // Lucide icons — tree-shaken but still sizeable
          'vendor-icons': ['lucide-react'],
          // Form utilities
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // HTTP
          'vendor-http': ['axios'],
        },
        // Clean filenames
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop() ?? ''
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'].includes(ext)) {
            return 'assets/img/[name]-[hash][extname]'
          }
          if (['mp4', 'webm', 'ogg'].includes(ext)) {
            return 'assets/video/[name]-[hash][extname]'
          }
          if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
      // Externalize nothing — keep everything bundled for SPA
    },
  },
  // Optimize deps pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'zustand',
      'lucide-react',
      'lenis',
      'gsap',
    ],
    // Exclude mermaid from pre-bundling (too large — lazy loaded anyway)
    exclude: ['mermaid'],
  },
})
