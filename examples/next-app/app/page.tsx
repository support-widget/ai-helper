import { AiHelper } from '@support-widget/ai-helper';

const features = [
  {
    number: '01',
    title: 'One component',
    copy: 'Drop in <AiHelper />, point it at your route, and you have a polished support assistant.',
  },
  {
    number: '02',
    title: 'Grounded answers',
    copy: 'Use the built-in BM25 docs loader so answers come from your documentation, not guesses.',
  },
  {
    number: '03',
    title: 'Yours to theme',
    copy: 'Shadow DOM isolation and a full token set make it feel native without fighting your CSS.',
  },
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Acme home">
          <img src="/acme-mark.svg" alt="" width="30" height="30" />
          <span>Acme</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#docs">Docs</a>
          <a className="nav-cta" href="#start">
            Get started
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span className="pulse" />
          Now with an AI helper
        </div>
        <h1>
          Support that answers
          <br />
          <em>before</em> the tab closes.
        </h1>
        <p className="lede">
          A tiny floating assistant that knows your docs, streams answers, and stays out of the
          way. Try the button in the corner — it is the real widget.
        </p>
        <div className="hero-actions" id="start">
          <a className="button primary" href="#features">
            Explore the demo
          </a>
          <code>npm i @support-widget/ai-helper</code>
        </div>
        <p className="micro">
          React 18+ · Shadow DOM · Streaming SSE · No client-side API key
        </p>
      </section>

      <section className="feature-grid" id="features" aria-label="Features">
        {features.map((feature) => (
          <article key={feature.number} className="feature">
            <span>{feature.number}</span>
            <h2>{feature.title}</h2>
            <p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="quote" id="docs">
        <p>
          “We replaced three help articles with one widget. Customers ask, the assistant answers
          from our docs, and we finally see the questions we were missing.”
        </p>
        <div className="quote-by">
          <span className="avatar">MK</span>
          <div>
            <strong>Maya Kim</strong>
            <span>Head of Support, Northwind</span>
          </div>
        </div>
      </section>

      <footer>
        <span>© 2026 Acme, a fictional demo.</span>
        <span>Built with the ai-helper open-source widget.</span>
      </footer>

      <AiHelper
        endpoint="/api/chat"
        title="Acme help"
        subtitle="Usually replies at once"
        logo="/acme-mark.svg"
        welcomeMessage="Hi! I know the Acme docs. Ask about setup, billing, or the API."
        suggestions={[
          'How do I install it?',
          'Is there a free plan?',
          'Can I use it with Next.js?',
          'Where are my invoices?',
        ]}
        placeholder="Ask about Acme…"
        accentColor="#6d5efc"
        metadata={{ page: 'next-demo-home' }}
      />
    </main>
  );
}
