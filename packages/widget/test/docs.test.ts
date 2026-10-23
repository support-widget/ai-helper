// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadDocsContext } from '../src/server/docs';

function responseFor(url: string): Response {
  if (url.endsWith('llms.txt')) {
    return new Response(
      [
        '# Acme docs',
        '',
        '- [Installation](https://docs.acme.test/install.md)',
        '- [Pricing](https://docs.acme.test/pricing.md)',
      ].join('\n'),
      { headers: { 'Content-Type': 'text/markdown' } },
    );
  }
  if (url.endsWith('install.md')) {
    return new Response(
      '# Installation\n\nInstall the package with `npm i @acme/sdk`. Then call init() in your app.',
      { headers: { 'Content-Type': 'text/markdown' } },
    );
  }
  if (url.endsWith('pricing.md')) {
    return new Response(
      '<html><body><h1>Pricing</h1><p>The starter plan is free forever.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    );
  }
  return new Response('missing', { status: 404 });
}

describe('loadDocsContext', () => {
  it('follows llms.txt links and ranks the most relevant chunks with BM25', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      responseFor(String(input)),
    ) as unknown as typeof fetch;

    const docs = await loadDocsContext({
      llmsTxtUrl: 'https://docs.acme.test/llms.txt',
      fetchImpl,
    });

    expect(docs.sourceCount).toBe(3);
    expect(docs.chunkCount).toBeGreaterThan(0);

    const results = docs.search('how do I install the package?');
    expect(results[0]?.source).toBe('https://docs.acme.test/install.md');
    expect(results[0]?.text).toContain('npm i @acme/sdk');

    const context = docs.getContext('free plan pricing', { maxChunks: 2, maxChars: 800 });
    expect(context).toContain('Source: https://docs.acme.test/pricing.md');
    expect(context).toContain('free forever');
    expect(context).not.toContain('<h1>');
  });

  it('loads a local docs directory without a vector database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'aih-docs-'));
    try {
      await writeFile(
        join(directory, 'guide.md'),
        '# Billing\n\nInvoices are emailed on the first day of each month.',
        'utf8',
      );
      await writeFile(join(directory, 'ignored.json'), '{"nope":true}', 'utf8');

      const docs = await loadDocsContext({ directory });
      expect(docs.sourceCount).toBe(1);
      expect(docs.search('when are invoices emailed?')[0]?.source).toBe('guide.md');
      expect(docs.getContext('invoices emailed')).toContain('first day of each month');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('requires at least one source', async () => {
    await expect(loadDocsContext({})).rejects.toThrow(/requires/i);
  });
});
