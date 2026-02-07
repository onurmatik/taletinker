import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'

const allowedHosts = ['taletinker.org', 'www.taletinker.org']

// https://vite.dev/config/
export default defineConfig({
  plugins: [vike(), react()],
  server: {
    allowedHosts,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    }
  },
  preview: {
    allowedHosts,
  },
})
