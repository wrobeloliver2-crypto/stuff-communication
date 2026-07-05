import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// build: 1783275841
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: false },
})
