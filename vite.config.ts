import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],

  // --- Add this for React Router client-side routing ---
  server: {
    historyApiFallback: true,
  },

  // Optional: ensure base path is root
  base: '/',
})
