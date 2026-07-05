import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// build: 1783275530
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: false },
})
