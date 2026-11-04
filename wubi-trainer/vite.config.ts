import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `base: './'` + singlefile makes `dist/index.html` usable when opened directly
// from disk (file://), as well as from any static host.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
})
