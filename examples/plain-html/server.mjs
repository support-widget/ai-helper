import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createChatHandler,
  toNodeHandler,
} from '@support-widget/ai-helper/server';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number.parseInt(process.env.PORT ?? '4174', 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Local demo provider; only used when ANTHROPIC_API_KEY is not set. */
const demoProvider = {
  name: 'plain-html-demo',
  async *stream(input) {
    const question =
      [...input.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const answer = /plan|price|free|cost/i.test(question)
      ? 'The **Starter plan is free forever** with 1,000 requests per month. Team is **$29/month**.\n\n> Local demo response. Set `ANTHROPIC_API_KEY` for live answers.'
      : 'Quick start:\n\n1. Add the script tag.\n2. Point `data-endpoint` at `createChatHandler`.\n3. Ship it.\n\n> Local demo response. Set `ANTHROPIC_API_KEY` for live answers.';

    for (const token of answer.match(/\S+\s*/g) ?? [answer]) {
      if (input.signal?.aborted) return;
      await sleep(18);
      yield { type: 'text', text: token };
    }
    yield { type: 'done', finishReason: 'stop' };
  },
};

const chatHandler = toNodeHandler(
  createChatHandler({
    provider: process.env.ANTHROPIC_API_KEY ? undefined : demoProvider,
    rateLimit: { limit: 20, windowMs: 60_000 },
    systemPrompt:
      'You help visitors of the Acme demo site. Keep answers short and only use provided context.',
    context: async () =>
      'Add the ai-helper script tag with data-endpoint. The Starter plan is free. Invoices email on the first of the month.',
  }),
);

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/acme-mark.svg', ['acme-mark.svg', 'image/svg+xml']],
  ['/cornerlark.svg', ['cornerlark.svg', 'image/svg+xml']],
  ['/reference', ['reference.html', 'text/html; charset=utf-8']],
  ['/reference.html', ['reference.html', 'text/html; charset=utf-8']],
  ['/embed.js', ['../../packages/widget/dist/embed.global.js', 'text/javascript; charset=utf-8']],
]);

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  if (pathname === '/api/chat') {
    await chatHandler(req, res);
    return;
  }

  const entry = staticFiles.get(pathname);
  if (!entry) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
    return;
  }

  try {
    const [file, type] = entry;
    const body = await readFile(join(root, file));
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Build the widget first: pnpm --filter @support-widget/ai-helper build');
  }
});

server.listen(port, () => {
  console.log(`Plain HTML demo: http://localhost:${port}`);
});
