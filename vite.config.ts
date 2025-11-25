import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from "path"

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Replace with '/repo-name/' if deploying to https://<USERNAME>.github.io/<REPO>/
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
