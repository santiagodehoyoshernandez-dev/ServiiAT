import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(__dirname, '../backend');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  const useHttps = env.USE_HTTPS === 'true';

  const httpsConfig = useHttps
    ? {
        key: fs.readFileSync(resolve(__dirname, '../certs/server.key')),
        cert: fs.readFileSync(resolve(__dirname, '../certs/server.crt')),
      }
    : undefined;

  return {
    plugins: [react()],
    envDir,
    server: {
      host: '0.0.0.0',
      port: 8080,
      ...(httpsConfig && { https: httpsConfig }),
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
      ...(httpsConfig && { https: httpsConfig }),
    },
  };
});