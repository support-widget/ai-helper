# @support-widget/ai-helper

A polished floating AI support assistant for any website. Add one component — or one script tag — plus one small backend route, and you have streaming, docs-grounded answers without exposing your model key.

![AI helper widget](https://raw.githubusercontent.com/support-widget/ai-helper/main/docs/widget-preview.png)

- **React 18+** component with a headless hook
- **Shadow DOM** isolation — host CSS cannot break it, widget CSS cannot leak out
- **Streaming SSE** with stop, retry, rate-limit, offline, and partial-stream handling
- **Safe Markdown** rendered as React nodes — never unsanitized HTML
- **Docs grounding** with a dependency-free BM25 loader (no vector database)
- **Framework-agnostic server handler** for Next.js, Hono, Remix, Bun, React Router, Cloudflare Workers, Express, and Node
- **IIFE embed build** for non-React sites
- **~15.5 kB gzipped** client, excluding React
- No client-side AI SDK, no analytics, no tracking

---

## 60-second quick start (React)

```bash
pnpm add @support-widget/ai-helper
```

```tsx
import { AiHelper } from '@support-widget/ai-helper';

export function App() {
  return (
    <AiHelper
      endpoint="/api/chat"
      title="Acme help"
      subtitle="Usually replies at once"
      suggestions={['How do I install it?', 'Is there a free plan?']}
      welcomeMessage="Hi! Ask me anything about Acme."
    />
  );
}
```

Create a backend route with `createChatHandler` and set `ANTHROPIC_API_KEY` on the server only:

```ts
// app/api/chat/route.ts (Next.js App Router)
import { createChatHandler } from '@support-widget/ai-helper/server';

export const runtime = 'nodejs';

const handler = createChatHandler({
  context: async (messages) => {
    const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    // Return relevant docs. See loadDocsContext() below for automatic BM25 retrieval.
    return question ? 'Your relevant documentation text…' : '';
  },
});

export async function POST(request: Request) {
  return handler(request);
}

export async function OPTIONS(request: Request) {
  return handler(request);
}
```

That is the complete setup. The browser sends messages to your route; your route streams tokens back.

---

## Next.js

```bash
pnpm add @support-widget/ai-helper
```

Add a normal App Router route (above), then render the widget anywhere — including in a Server Component:

```tsx
import { AiHelper } from '@support-widget/ai-helper';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AiHelper title="Acme help" endpoint="/api/chat" />
    </>
  );
}
```

The package ships a client boundary. If you use Turbopack, no extra config is normally needed. With older webpack setups, add the package to `transpilePackages` if your bundler does not follow the exports map:

```ts
// next.config.ts
export default { transpilePackages: ['@support-widget/ai-helper'] };
```

## Vite

```bash
pnpm add @support-widget/ai-helper
```

Render `<AiHelper />` in your React tree and point it at a Vite dev/preview middleware or your production Node server. The included example shows both a real handler and a local demo provider in `vite.config.ts`.

## Plain HTML / no build step

```html
<script
  src="https://unpkg.com/@support-widget/ai-helper/dist/embed.global.js"
  data-endpoint="/api/chat"
  data-title="Acme help"
  data-subtitle="Usually replies at once"
  data-accent="#8c8c8c"
  data-suggestions="How do I install it?|Is there a free plan?"
  data-theme="dark"
  defer
></script>
```

It auto-mounts on `DOMContentLoaded`. You can also control it programmatically:

```html
<script>
  window.AiHelper.init({
    endpoint: '/api/chat',
    title: 'Acme help',
    suggestions: ['How do I install it?'],
  });
  window.AiHelper.open();
  window.AiHelper.close();
  window.AiHelper.destroy();
</script>
```

### Embed data attributes

| Attribute | Maps to |
| --- | --- |
| `data-endpoint` | `endpoint` |
| `data-title` | `title` |
| `data-subtitle` | `subtitle` |
| `data-logo` | `logo` (URL) |
| `data-welcome-message` | `welcomeMessage` |
| `data-suggestions` | `suggestions` separated by `|` |
| `data-position` | `bottom-right` or `bottom-left` |
| `data-theme` | `dark`, `light`, or `auto` |
| `data-accent` | `accentColor` |
| `data-persist` | `"false"` to disable localStorage |
| `data-placeholder` | `placeholder` |
| `data-default-open` | `"true"` to open on load |
| `data-hide-suggestions-after-first-message` | `"false"` to keep chips visible |
| `data-assistant-name` | `assistantName` |
| `data-z-index` | `zIndex` |
| `data-max-input-length` | `maxInputLength` |
| `data-metadata` | JSON object sent with requests |
| `data-headers` | JSON object of extra request headers |
| `data-auto-mount` | `"false"` to skip automatic mounting |

`data-headers` is visible to every visitor. Never put secrets in it.

---

## `<AiHelper />` props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `endpoint` | `string` | `"/api/chat"` | Your SSE chat route. |
| `title` | `string` | `"AI helper"` | Header title and fallback logo initials. |
| `subtitle` | `string` | `"Usually replies at once"` | Header status line. |
| `logo` | `string \| ReactNode` | initials | Image URL or custom logo node. |
| `welcomeMessage` | `string` | friendly welcome | Shown when the conversation is empty. |
| `suggestions` | `string[]` | `[]` | Horizontally scrollable question chips. |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Launcher/panel corner. |
| `defaultOpen` | `boolean` | `false` | Open on mount. Ignored inside a provider. |
| `theme` | `"dark" \| "light" \| "auto"` | `"dark"` | Built-in token set. |
| `accentColor` | `string` | token value | Send button and accent override. |
| `persist` | `boolean` | `true` | Save messages in `localStorage`. |
| `storageKey` | `string` | `aih:conversation:v1` | Custom storage key. |
| `placeholder` | `string` | `"Ask a question"` | Composer placeholder. |
| `headers` | `Record<string, string>` | `{}` | Extra POST headers. |
| `metadata` | `Record<string, unknown>` | `{}` | Sent with every request. |
| `maxInputLength` | `number` | `4000` | Client-side composer cap. |
| `assistantName` | `string` | short title | Name in the typing indicator. |
| `hideSuggestionsAfterFirstMessage` | `boolean` | `true` | Hide chips once the user has sent a message. |
| `fontFamily` | `string` | system stack | Pass `"inherit"` to use the host font. |
| `zIndex` | `number` | `2147483000` | Host stacking level. |
| `onOpenChange` | `(open: boolean) => void` | — | Panel opened/closed. |
| `onMessage` | `(message: ChatMessage) => void` | — | Fires for the sent user message and completed assistant message. |
| `onError` | `(error: AiHelperError) => void` | — | Network, stream, HTTP, rating, and validation failures. |

---

## Headless hook

`useAiHelper()` gives you the whole chat loop without the UI:

```tsx
import { useAiHelper } from '@support-widget/ai-helper';

function CustomChat() {
  const { messages, send, stop, reset, retry, status, error, isStreaming, isOnline } =
    useAiHelper({
      endpoint: '/api/chat',
      metadata: { workspace: 'acme' },
      onError: console.error,
    });

  return (
    <>
      {messages.map((message) => (
        <p key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </p>
      ))}
      <button disabled={!isOnline || isStreaming} onClick={() => send('Hello')}>
        Send
      </button>
      {isStreaming && <button onClick={stop}>Stop</button>}
      {error && <button onClick={retry}>Retry</button>}
      <button onClick={reset}>New chat</button>
      <small>{status}</small>
    </>
  );
}
```

`status` is `idle | submitting | streaming | error | offline`. `error` is an `AiHelperError` with `code`, `message`, optional `status`, and `retryAfter`.

## Programmatic open/close

```tsx
import React from 'react';
import {
  AiHelper,
  AiHelperProvider,
  useAiHelperControls,
} from '@support-widget/ai-helper';

function HeaderButton() {
  const { openHelper, closeHelper, toggleHelper, isOpen } = useAiHelperControls();
  return (
    <>
      <button onClick={openHelper}>Open help</button>
      <button onClick={closeHelper}>Close help</button>
      <button onClick={toggleHelper}>{isOpen ? 'Hide' : 'Show'} helper</button>
    </>
  );
}

export function App() {
  return (
    <AiHelperProvider>
      <HeaderButton />
      <AiHelper title="Acme help" endpoint="/api/chat" />
    </AiHelperProvider>
  );
}
```

`useAiHelperControls()` must be used inside `<AiHelperProvider>`. The provider only controls the panel; chat state still uses the hook.

---

## Theming

All styling lives in the Shadow DOM. Override tokens from the host page; they inherit into the shadow tree:

```css
:root {
  --aih-bg: #0f1117;
  --aih-bg-raised: #171a23;
  --aih-fg: #f5f5f5;
  --aih-fg-muted: #9a9a9a;
  --aih-border: #2a2a2a;
  --aih-bubble-user: #1c1c1c;
  --aih-bubble-bot: #0a0a0a;
  --aih-accent: #8c8c8c;
  --aih-accent-fg: #0a0a0a;
  --aih-online: #4ade80;
  --aih-radius: 16px;
  --aih-width: 320px;
  --aih-height: 416px;
  --aih-font: Inter, system-ui, sans-serif;
}
```

| Token | Purpose |
| --- | --- |
| `--aih-bg` | Panel background |
| `--aih-bg-raised` | Launcher, stop button, scroll button |
| `--aih-fg` | Primary text |
| `--aih-fg-muted` | Status, placeholder, typing, metadata |
| `--aih-border` | Panel and control borders |
| `--aih-bubble-user` | User bubble background |
| `--aih-bubble-bot` | Assistant bubble background |
| `--aih-bubble-bot-border` | Assistant bubble border |
| `--aih-chip-bg` / `--aih-chip-border` | Suggestion chips |
| `--aih-input-bg` | Composer input background |
| `--aih-focus` | Visible focus ring |
| `--aih-accent` / `--aih-accent-fg` | Send button colors |
| `--aih-logo-bg` / `--aih-logo-fg` | Initials logo tile |
| `--aih-online` | Online status dot (`#4ade80` for green) |
| `--aih-danger` | Error accent |
| `--aih-radius` | Panel radius |
| `--aih-width` / `--aih-height` | Desktop panel size |
| `--aih-font` | Font stack |
| `--aih-shadow` | Panel shadow |

The `accentColor` prop wins over `--aih-accent` for that widget. Use `theme="auto"` to follow `prefers-color-scheme`; both built-in themes define the complete token set.

The panel is 320×416 by default and full-screen below 480px. Override `--aih-width` and `--aih-height` if you need a larger desktop panel.

---

## Server helpers

Import from the dedicated server entry so no server code enters the client bundle:

```ts
import {
  createChatHandler,
  toExpressHandler,
  toNodeHandler,
  createAnthropicProvider,
  loadDocsContext,
  MemoryRateLimitStore,
} from '@support-widget/ai-helper/server';
```

### `createChatHandler(options)`

Returns a standard `(request: Request) => Promise<Response>` function. It works in Next.js route handlers, Hono, Bun, Remix, React Router, Cloudflare Workers, and any runtime with Web `Request`/`Response`/`ReadableStream`.

| Option | Default | Description |
| --- | --- | --- |
| `apiKey` | `process.env.ANTHROPIC_API_KEY` | Server-side Anthropic key. |
| `model` | `AI_HELPER_MODEL` or `claude-3-5-haiku-latest` | Model ID. |
| `baseURL` | SDK default | Anthropic-compatible gateway/proxy URL. |
| `systemPrompt` | guardrailed default | Replaces the default prompt; retrieved context is still appended. |
| `maxTokens` | `700` | Max output tokens (capped at 4096). |
| `maxMessages` | `20` | Max conversation turns accepted. |
| `maxInputChars` | `16000` | Max total conversation characters. |
| `allowedOrigins` | unset | Browser origin allowlist. Requests without `Origin` (server-to-server) are allowed. |
| `rateLimit` | `20 / 60s` by IP | `false` to disable, or `{ limit, windowMs, store, key }`. |
| `context` | unset | `(messages) => Promise<string>` docs/context injector. |
| `onFinish` | unset | `({ status, model, messages, metadata, responseChars, durationMs, usage, error }) => void`. |
| `provider` | Anthropic | Bring your own `ChatProvider`. |

The handler validates with zod, caps the request body at 256 KB, metadata at 8 KB, rejects non-user final messages, applies CORS, and returns JSON errors with proper status codes. Secrets are never logged by the handler.

### Express

```ts
import express from 'express';
import { createChatHandler, toExpressHandler } from '@support-widget/ai-helper/server';

const app = express();
const handler = createChatHandler({ rateLimit: { limit: 20, windowMs: 60_000 } });

// You can mount this before express.json(), or after it — the adapter handles both.
app.post('/api/chat', toExpressHandler(handler));
```

### Node `http`

```ts
import { createServer } from 'node:http';
import { createChatHandler, toNodeHandler } from '@support-widget/ai-helper/server';

const handler = toNodeHandler(createChatHandler({}));

createServer((req, res) => {
  if (req.url === '/api/chat') return handler(req, res);
  res.statusCode = 404;
  res.end();
}).listen(3000);
```

### Docs grounding with BM25

No embeddings or vector database are required for v1:

```ts
import { loadDocsContext } from '@support-widget/ai-helper/server';

const docs = await loadDocsContext({
  llmsTxtUrl: 'https://docs.acme.com/llms.txt',
  urls: ['https://docs.acme.com/quickstart.md'],
  // directory: './docs', // or read local .md/.mdx/.txt files (Node only)
});

const handler = createChatHandler({
  context: async (messages) => {
    const question = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return docs.getContext(question, { maxChunks: 4, maxChars: 6000 });
  },
});
```

`loadDocsContext()` fetches `llms.txt` and its Markdown links, HTML-strips pages, chunks them, and returns `{ search(query), getContext(query), chunkCount, sourceCount }`. Ranking is keyword BM25 with stopword filtering. It is intentionally deterministic and cheap.

### Custom provider

```ts
import type { ChatProvider } from '@support-widget/ai-helper/server';

const provider: ChatProvider = {
  name: 'my-model',
  async *stream({ messages, system, maxTokens, signal }) {
    for await (const token of myModel.stream({ messages, system, maxTokens, signal })) {
      yield { type: 'text', text: token };
    }
    yield { type: 'done', finishReason: 'stop' };
  },
};

createChatHandler({ provider });
```

A provider only needs an async iterable of `{ type: 'text', text }` and `{ type: 'done', finishReason?, usage? }`.

### Shared rate-limit stores

The default store is in-memory and per-process. For multiple instances, implement the tiny `RateLimitStore` interface:

```ts
const handler = createChatHandler({
  rateLimit: {
    limit: 30,
    windowMs: 60_000,
    store: {
      async hit(key, windowMs) {
        // e.g. Redis INCR + EXPIRE, Upstash, Cloudflare KV, DynamoDB…
        return { count: await redis.incr(key), resetAt: Date.now() + windowMs };
      },
    },
  },
});
```

---

## SSE protocol

The client is deliberately provider-agnostic. Your endpoint receives:

```http
POST /api/chat
Content-Type: application/json
Accept: text/event-stream

{
  "messages": [
    { "role": "user", "content": "How do I install it?" }
  ],
  "metadata": { "page": "/docs" }
}
```

Respond with `Content-Type: text/event-stream; charset=utf-8` and these named events:

```text
event: delta
data: {"text":"Run "}

event: delta
data: {"text":"npm i @acme/sdk"}

event: done
data: {"finishReason":"stop"}

```

Error event:

```text
event: error
data: {"error":"The assistant is temporarily unavailable.","code":"server_error"}
```

Rules:

- `delta` events may arrive in arbitrary network chunks.
- A `done` event is required. Without it, the widget treats the stream as cut off and offers Retry.
- HTTP failures should use a non-2xx JSON body: `{ "error": { "code": "...", "message": "..." } }`.
- `429` is shown as a friendly rate-limit state and reads `Retry-After`.
- Aborting the fetch cancels the request; the server adapter forwards the abort signal to the provider.

`metadata` is passed through to `onFinish`; it is never sent to the model automatically.

---

## Security

- **The API key never reaches the browser.** The client bundle has no provider SDK and no secrets.
- **Raw HTML is never injected.** Markdown is parsed into React elements; links are restricted to `http(s)`, `mailto`, absolute paths, and fragments; external links use `target="_blank" rel="noopener noreferrer"`.
- **Input is bounded.** Request body, metadata, message count, character count, output tokens, and provider calls are capped.
- **Rate limiting is on by default** at 20 requests/minute per IP.
- **Origin allowlisting is optional** and CORS-aware. If set, requests with a mismatched `Origin` get `403`; requests without `Origin` are allowed for server-to-server use.
- **No analytics, tracking, eval, remote code, or third-party AI SDK in the client.**
- **Shadow DOM** isolates host styles in both directions.
- **SSR-safe** — no `window` access during render.
- For production multi-instance deployments, use a shared rate-limit store and put your own auth in front of the route if needed.

### Demo credentials

The three example apps automatically use a local, server-side demo provider when `ANTHROPIC_API_KEY` is unset. That keeps `pnpm dev` usable with zero credentials. Set the key to switch those routes to Anthropic — it is read only in the server process.

---

## Bundle and compatibility

- Client entry, React excluded: **~15.5 kB gzipped** (size-limit budget: 40 kB).
- Peer dependencies: `react >=18`, `react-dom >=18`.
- Modern evergreen browsers with Shadow DOM, `ReadableStream`, `fetch`, and CSS custom properties.
- The IIFE embed bundles React so a plain HTML page needs only the `<script>` tag.
- Server helpers require Node 18.18+ when used with the built-in adapters; the Web handler itself is runtime-agnostic.

---

## FAQ

**Can I use my own model?**  
Yes. Pass a custom `provider` to `createChatHandler`. Anthropic ships built in; OpenAI-compatible providers fit the same interface.

**Can I write the backend myself?**  
Yes. Any server that implements the SSE protocol above works. No package server code is required.

**Does it support Next.js App Router?**  
Yes. The package and server entry are split, the client entry has a `"use client"` boundary, and the widget is SSR-safe.

**How do I stop the conversation from persisting?**  
Set `persist={false}` or `data-persist="false"`.

**How do I clear a conversation?**  
Use the new-chat action in the header (revealed on hover/focus to keep the compact two-icon header), or `reset()` from `useAiHelper()`. In the embed, call `window.AiHelper.destroy()` and re-init for a full reset.

**Why does my route return “The chat service is not configured”?**  
The production handler needs `ANTHROPIC_API_KEY` (or a custom provider). The examples intentionally provide a local demo provider, but your production route should set the key.

**Can I run it in a Cloudflare Worker?**  
The Web handler works there. Use a shared rate-limit store and a provider with an edge-compatible SDK. `loadDocsContext({ directory })` is Node-only; fetch URLs or use `llmsTxtUrl` at the edge.

**Does it work with React 19?**  
Yes. React 18 and 19 are supported.

**Can I use multiple widgets?**  
Use distinct `storageKey` values and, if needed, distinct `endpoint`s. A single provider controls one panel by default.

**Does it send page URLs automatically?**  
No. Pass what you want via `metadata`, for example `metadata={{ page: window.location.pathname }}` from a client wrapper.

---

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm size
pnpm e2e
```

Workspace layout:

```text
packages/widget/      @support-widget/ai-helper (client, server, embed, tests)
examples/next-app/    Next.js App Router demo (local mock fallback)
examples/vite-app/    Vite + React demo (local mock fallback)
examples/plain-html/  Script-embed demo (local mock fallback)
docs/                 Screenshots and assets
```

Change flow uses Changesets:

```bash
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

## License

MIT © AI Helper contributors
