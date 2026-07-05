import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// build: 1783251244
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: false },
})
