import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Actions BASE_PATH değerini repository adına göre verir.
// Yerel geliştirmede kök dizin kullanılır.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
})
