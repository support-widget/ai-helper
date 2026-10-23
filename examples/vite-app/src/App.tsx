import {
  AiHelper,
  AiHelperProvider,
  useAiHelperControls,
} from '@support-widget/ai-helper';
import type { ReactNode } from 'react';

function OpenButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { openHelper } = useAiHelperControls();
  return (
    <button type="button" className={className} onClick={openHelper}>
      {children}
    </button>
  );
}

function Header() {
  return (
    <header className="header">
      <a className="brand" href="#">
        <span className="brand-mark">A</span>
        Acme
      </a>
      <nav>
        <a href="#features">Features</a>
        <a href="#docs">Docs</a>
        <OpenButton className="outline-button">Ask AI</OpenButton>
      </nav>
    </header>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="m5 10.5 3.2 3.2L15.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  return (
    <AiHelperProvider>
      <main>
        <Header />

        <section className="hero">
          <div className="hero-copy">
            <span className="kicker">LIVE VITE DEMO</span>
            <h1>
              Questions in.
              <br />
              Clear answers <span>out.</span>
            </h1>
            <p>
              This page runs the actual React package. The dev server exposes one tiny SSE route,
              and no Anthropic key ever touches the browser.
            </p>
            <div className="actions">
              <OpenButton className="primary-button">Open the helper</OpenButton>
              <code>npm i @support-widget/ai-helper</code>
            </div>
          </div>

          <aside className="preview-card" aria-label="Widget preview">
            <div className="preview-top">
              <span className="preview-avatar">A</span>
              <div>
                <strong>Acme help</strong>
                <span>
                  <i /> Usually replies at once
                </span>
              </div>
            </div>
            <div className="bubble assistant">Hi! Ask me about install, plans, or invoices.</div>
            <div className="bubble user">Is there a free plan?</div>
            <div className="bubble assistant">
              Yes — the <strong>Starter plan is free forever</strong> with 1,000 requests a month.
            </div>
            <div className="preview-input">
              Ask a question
              <span>↑</span>
            </div>
          </aside>
        </section>

        <section className="features" id="features">
          <article>
            <CheckIcon />
            <h2>Streams by default</h2>
            <p>Tokens render as they arrive, with a stop button and graceful retries.</p>
          </article>
          <article>
            <CheckIcon />
            <h2>CSS cannot break it</h2>
            <p>Shadow DOM keeps host styles out and all widget styles safely inside.</p>
          </article>
          <article>
            <CheckIcon />
            <h2>Server-owned secrets</h2>
            <p>The included handler keeps your model provider key on the server.</p>
          </article>
        </section>

        <section className="docs" id="docs">
          <span>01 / QUICK START</span>
          <h2>Add a route. Add a widget.</h2>
          <pre>
            <code>{`// vite.config.ts → dev middleware
const handler = createChatHandler({ rateLimit: true });

// app.tsx
<AiHelper endpoint="/api/chat" title="Acme help" />`}</code>
          </pre>
        </section>

        <footer>
          <span>Acme × @support-widget/ai-helper</span>
          <span>StrictMode enabled · React 19</span>
        </footer>
      </main>

      <AiHelper
        endpoint="/api/chat"
        title="Acme help"
        subtitle="Usually replies at once"
        logo="/acme-mark.svg"
        welcomeMessage="Hi! Ask about the SDK, plans, or billing. This Vite demo runs a local provider unless an API key is configured."
        suggestions={[
          'How do I install it?',
          'Is there a free plan?',
          'Can I use it with Vite?',
          'Where are my invoices?',
        ]}
        accentColor="#0f766e"
        theme="light"
        metadata={{ page: 'vite-demo', framework: 'vite' }}
        onOpenChange={(open) => {
          document.body.dataset.helperOpen = String(open);
        }}
      />
    </AiHelperProvider>
  );
}
