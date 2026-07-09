import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      // additive only — index.html's own entry/output is unchanged; this just
      // adds the isolated WebGL prototype (P3 spike) as a second page in dist/
      input: {
        main: resolve(__dirname, 'index.html'),
        webglProto: resolve(__dirname, 'webgl-proto.html'),
      },
    },
  },
  server: {
    host: true,
  },
});
