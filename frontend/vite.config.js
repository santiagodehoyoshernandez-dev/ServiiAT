import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// configuracion
export default defineConfig({
  plugins: [react()],
  envDir: resolve(dirname(fileURLToPath(import.meta.url)), '../backend'),
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync(new URL('../certs/localhost.key', import.meta.url)),
      cert: fs.readFileSync(new URL('../certs/localhost.crt', import.meta.url)),
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});