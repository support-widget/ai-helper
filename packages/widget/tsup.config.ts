import { defineConfig } from 'tsup';

const shared = {
  target: 'es2020',
  sourcemap: true,
  clean: false,
  splitting: false,
  treeshake: true,
} as const;

export default defineConfig([
  {
    ...shared,
    clean: true,
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  },
  {
    ...shared,
    entry: { 'server/index': 'src/server/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: [
      'react',
      'react-dom',
      'zod',
      '@anthropic-ai/sdk',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:stream',
    ],
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  },
  {
    ...shared,
    entry: { 'embed.global': 'src/embed.tsx' },
    format: ['iife'],
    globalName: 'AiHelperBundle',
    platform: 'browser',
    minify: true,
    dts: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    outExtension: () => ({ js: '.js' }),
  },
]);
