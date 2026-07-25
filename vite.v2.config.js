import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const v2Root = path.resolve(root, '../homepage-v2');

/** Static MPA — original Babel-in-browser homepage (pre-SPA migration). */
export default defineConfig({
  root: v2Root,
  cacheDir: path.resolve(root, 'node_modules/.vite-homepage-v2'),
  optimizeDeps: { noDiscovery: true },
  server: {
    port: 5174,
    strictPort: true,
    open: '/index.html',
    fs: { allow: [v2Root, root] },
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
  appType: 'mpa',
});
