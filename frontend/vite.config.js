import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  const apiBaseUrl = env.VITE_API_BASE_URL || '';

  let proxyTarget = 'http://localhost:3000';
  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    try {
      const url = new URL(apiBaseUrl);
      proxyTarget = `${url.protocol}//${url.host}`;
    } catch {
      proxyTarget = 'http://localhost:3001';
    }
  }

  if (env.VITE_PROXY_TARGET) {
    proxyTarget = env.VITE_PROXY_TARGET;
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
