import { resolve } from 'node:path';

/**
 * The yard on its own, in a browser.
 *
 * `pnpm run yard` serves `src/renderer/yard.html`: the writing layer over the
 * real island, composed out of the real world files, fed the designs' own
 * session. No Electron, no wire, no agent, and it reloads as you type. It is
 * how the yard gets looked at while it is being drawn; the app is how it gets
 * judged.
 */
export default {
  root: resolve(import.meta.dirname, '../src/renderer'),
  base: './',
  publicDir: resolve(import.meta.dirname, '../assets'),
  resolve: {
    alias: {
      '@renderer': resolve(import.meta.dirname, '../src/renderer'),
      '@shared': resolve(import.meta.dirname, '../src/shared'),
    },
  },
  optimizeDeps: { entries: ['yard.html'] },
  server: { port: 3199, strictPort: true, open: '/yard.html' },
};
