import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
  proxy: {
    '/api/exercises': {
      target: 'https://oss.exercisedb.dev',
      changeOrigin: true,
      rewrite: () => '/api/v1/exercises',
    },
  },
},
})



