import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: { host: '127.0.0.1', port: 8080, strictPort: true, fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local-mail/**'] }, proxy: { '/api': 'http://127.0.0.1:3001' } },
  plugins: [
    react(),
    tailwindcss(),
  ],
})