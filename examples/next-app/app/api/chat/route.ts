import {
  createChatHandler,
  type ChatProvider,
  type ProviderStreamEvent,
} from '@support-widget/ai-helper/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Demo-only local provider. The example works with zero credentials, while
 * setting ANTHROPIC_API_KEY switches it to the real docs-grounded assistant.
 */
const demoProvider: ChatProvider = {
  name: 'next-demo',
  async *stream(input): AsyncIterable<ProviderStreamEvent> {
    const question =
      [...input.messages].reverse().find((message) => message.role === 'user')?.content ?? '';

    let answer: string;
    if (/install|setup|quick ?start/i.test(question)) {
      answer =
        'Install the SDK with `npm install @acme/sdk`, then call `init()` on the server. The Quick start guide walks through it in about two minutes.';
    } else if (/free|price|plan|cost|billing/i.test(question)) {
      answer =
        'Yes — the **Starter plan is free forever** and includes 1,000 requests per month. The Team plan is **$29/month** with 25,000 requests and shared projects.';
    } else if (/invoice|receipt|charge/i.test(question)) {
      answer =
        'Invoices are emailed on the first day of each month to your billing address. Previous invoices are available under **Settings → Billing**.';
    } else if (/next|vite|react|framework|bun|worker/i.test(question)) {
      answer =
        'Acme works with **React, Next.js, Vite, Remix, Bun, and Cloudflare Workers**. This demo itself is a Next.js App Router route using the same handler.';
    } else if (/human|agent|person|support/i.test(question)) {
      answer =
        'I can pass this to the team. A human usually replies within a few hours — this demo would normally connect your support inbox here.';
    } else {
      answer =
        "I don't know from the Acme docs. Try asking about installation, plans, invoices, or supported frameworks.\n\n> This demo is running a local provider because no API key is configured.";
    }

    // Let the typing indicator render before the first token.
    await sleep(650);
    for (const token of answer.match(/\S+\s*/g) ?? [answer]) {
      if (input.signal?.aborted) return;
      await sleep(18);
      yield { type: 'text', text: token };
    }
    yield { type: 'done', finishReason: 'stop' };
  },
};

const ACME_DOCS = `# Acme docs

## Installation
Install the SDK with \`npm install @acme/sdk\`, then import { init } from '@acme/sdk' and call init({ apiKey: process.env.ACME_KEY }) on the server. The SDK works with Node 18+, Next.js, Vite, Bun, and Cloudflare Workers.

## Plans
The Starter plan is free forever and includes 1,000 requests per month. The Team plan is $29 per month with 25,000 requests and shared projects. Enterprise is custom priced.

## Invoices
Invoices are emailed on the first day of each month to the billing email on file. Owners can download previous invoices from Settings → Billing.

## API
Send JSON to POST /v1/messages with an Authorization: Bearer <key> header. Responses stream as server-sent events. The API rate limit is 60 requests per minute by default.`;

const apiKey = process.env.ANTHROPIC_API_KEY;

const handler = createChatHandler({
  apiKey,
  provider: apiKey ? undefined : demoProvider,
  systemPrompt:
    'You are Acme support. Acme is a fictional developer platform. Help with installation, API usage, billing, and plans. Use the documentation context when present. Keep answers short and friendly.',
  maxTokens: 700,
  maxMessages: 24,
  rateLimit: { limit: 20, windowMs: 60_000 },
  context: async (messages) => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return '';
    return ACME_DOCS;
  },
});

export async function POST(request: Request) {
  return handler(request);
}

export async function OPTIONS(request: Request) {
  return handler(request);
}
