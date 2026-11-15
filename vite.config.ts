import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages deposu "psychora" adıyla oluşturulmalıdır.
// Yerel geliştirmede kök dizin, üretim derlemesinde depo alt yolu kullanılır.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/psychora/' : '/',
}))
