import { readFile, writeFile } from 'node:fs/promises';

// esbuild intentionally strips module-level directives while bundling, so the
// client entries get their Next.js "use client" boundary from this post-step.
for (const file of ['dist/index.js', 'dist/index.cjs']) {
  const source = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '');
  if (!source.startsWith("'use client'") && !source.startsWith('"use client"')) {
    await writeFile(file, `'use client';\n${source}`, 'utf8');
  }
}
