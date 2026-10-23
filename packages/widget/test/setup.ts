import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';

if (hasDom && !Element.prototype.scrollTo) {
  Object.defineProperty(Element.prototype, 'scrollTo', {
    configurable: true,
    value: function scrollTo() {
      // jsdom does not implement scrolling.
    },
  });
}

if (hasDom && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  for (const host of document.querySelectorAll('[data-ai-helper]')) host.remove();
  window.localStorage.clear();
});
