import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'test'],
    environment: 'node',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
