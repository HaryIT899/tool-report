import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0', // Cho phép truy cập từ mạng
    port: 5173,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Backend local
        changeOrigin: true,
        secure: false,
      },
    },
  },
});