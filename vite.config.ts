import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* Chunk halaman dimuat lazy, jadi baru diminta setelah bundle utama selesai dieksekusi: satu round trip tambahan sebelum konten muncul.
   Skrip kecil di head meminta chunk rute sekarang, sejajar dengan bundle utama. */
const ROUTE_CHUNKS: Record<string, string> = { '/claim': 'Claim', '/dashboard': 'Dashboard', '/login': 'Login', '/report': 'Report' }
function preloadRouteChunks(): Plugin {
  return {
    name: 'preload-route-chunks',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return
        const files: Record<string, string[]> = {}
        for (const [path, name] of Object.entries(ROUTE_CHUNKS)) {
          const chunk = Object.values(ctx.bundle).find((c) => c.type === 'chunk' && c.isDynamicEntry && c.name === name)
          if (chunk?.type === 'chunk') files[path] = [chunk.fileName, ...chunk.imports].map((f) => `/${f}`)
        }
        const code = `(function(){var m=${JSON.stringify(files)}[location.pathname.replace(/\\/$/,'')]||[];m.forEach(function(f){var l=document.createElement('link');l.rel='modulepreload';l.href=f;document.head.appendChild(l)})})()`
        return [{ tag: 'script', children: code, injectTo: 'head' }]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadRouteChunks()],
  // Dev: samakan Origin dengan host Worker agar pelindung CSRF tidak menolak permintaan lewat proxy.
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true, headers: { origin: 'http://127.0.0.1:8787' } } } },
})
