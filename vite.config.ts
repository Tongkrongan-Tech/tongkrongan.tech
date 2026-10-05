import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev: samakan Origin dengan host Worker agar pelindung CSRF tidak menolak permintaan lewat proxy.
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true, headers: { origin: 'http://127.0.0.1:8787' } } } },
})
