import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Zip deploy uploads dist/ — copy Amplify header rules into the artifact. */
function copyAmplifyCustomHttp() {
  return {
    name: 'copy-amplify-custom-http',
    closeBundle() {
      const src = path.join(root, 'customHttp.yml');
      const dest = path.join(root, 'dist', 'customHttp.yml');
      if (existsSync(src)) copyFileSync(src, dest);
    },
  };
}

export default defineConfig(({ mode }) => {
  let proxyTarget = 'http://localhost:8082'; // Default to local backend

  if (mode === 'dev') {
    proxyTarget = 'http://13.209.47.166:8082';
  } else if (mode === 'prd') {
    proxyTarget = 'http://anytap-alb-1199820250.ap-northeast-2.elb.amazonaws.com';
  } else if (mode === 'loc') {
    proxyTarget = 'http://localhost:8082';
  }

  console.log(`\x1b[36m[Vite Proxy Info] Active Mode: ${mode} | Routing /api/v1 to: ${proxyTarget}\x1b[0m`);

  return {
    plugins: [react(), copyAmplifyCustomHttp()],
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/v1': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
