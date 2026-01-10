import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  webExt: {
    disabled: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  }),
});

