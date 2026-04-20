import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');

  // 👉 ưu tiên env cho dễ switch ngrok/local
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],

    server: {
      host: true,
      port: 5173,

      allowedHosts: true, // ✅ QUAN TRỌNG

      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});