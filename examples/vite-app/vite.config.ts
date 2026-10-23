import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  createChatHandler,
  toNodeHandler,
  type ChatProvider,
  type ProviderStreamEvent,
} from '@support-widget/ai-helper/server';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Local-only provider used when ANTHROPIC_API_KEY is absent, so the demo runs
 * without any cloud credentials. It never reaches the browser.
 */
const demoProvider: ChatProvider = {
  name: 'vite-demo',
  async *stream(input): AsyncIterable<ProviderStreamEvent> {
    const question =
      [...input.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const pricing = /price|plan|free|cost/i.test(question);
    const answer = pricing
      ? `The **Starter plan is free forever** and includes 1,000 requests per month.\n\nThe Team plan is **$29/month** for 25,000 requests and shared projects.\n\n> This is a local demo response. Add \`ANTHROPIC_API_KEY\` for live answers.`
      : `Here is the short version:\n\n1. Install with \`npm install @acme/sdk\`.\n2. Call \`init()\` on the server with your key.\n3. Send requests to \`POST /v1/messages\`.\n\n> This is a local demo response. Add \`ANTHROPIC_API_KEY\` for live, docs-grounded answers.`;

    for (const token of answer.match(/\S+\s*/g) ?? [answer]) {
      if (input.signal?.aborted) return;
      await sleep(16);
      yield { type: 'text', text: token };
    }
    yield { type: 'done', finishReason: 'stop' };
  },
};

function chatApi(handler: (request: Request) => Promise<Response>): Plugin {
  const nodeHandler = toNodeHandler(handler);
  const middleware: Connect.NextHandleFunction = (req, res) => {
    void nodeHandler(req, res);
  };
  return {
    name: 'aih-demo-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.ANTHROPIC_API_KEY || undefined;
  const handler = createChatHandler({
    apiKey,
    provider: apiKey ? undefined : demoProvider,
    rateLimit: { limit: 20, windowMs: 60_000 },
    systemPrompt:
      'You are Acme support. Acme is a fictional developer platform. Help with installation, API usage, billing, and plans. Keep answers short.',
    context: async () => `# Acme docs
The Starter plan is free forever with 1,000 requests/month. Team is $29/month.
Install the SDK with npm install @acme/sdk. Call init() on the server.
Invoices are emailed on the first day of each month.`,
  });

  return {
    plugins: [react(), chatApi(handler)],
    server: { port: 5173 },
    preview: { port: 4173 },
  };
});
