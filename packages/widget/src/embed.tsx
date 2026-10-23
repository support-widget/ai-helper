'use client';

import { createRoot, type Root } from 'react-dom/client';
import { useEffect } from 'react';
import { AiHelper } from './AiHelper';
import { AiHelperProvider, useAiHelperControls } from './provider';
import type { AiHelperControls, AiHelperPosition, AiHelperProps, AiHelperTheme } from './types';

export interface EmbedApi {
  init: (options?: AiHelperProps) => void;
  open: () => void;
  close: () => void;
  destroy: () => void;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let controls: AiHelperControls | null = null;
let lastOptions: AiHelperProps = {};

function Bridge() {
  const current = useAiHelperControls();
  useEffect(() => {
    controls = current;
    return () => {
      if (controls === current) controls = null;
    };
  }, [current]);
  return null;
}

function render(options: AiHelperProps) {
  if (typeof document === 'undefined') return;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => render(options), { once: true });
    return;
  }

  lastOptions = options;
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-ai-helper-embed', '');
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;';
    document.body.appendChild(host);
    root = createRoot(host);
  }

  const { defaultOpen = false, ...widgetProps } = options;
  root?.render(
    <AiHelperProvider defaultOpen={defaultOpen}>
      <Bridge />
      <AiHelper {...widgetProps} />
    </AiHelperProvider>,
  );
}

function destroy() {
  controls = null;
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

const api: EmbedApi = {
  init: (options = {}) => render(options),
  open: () => controls?.openHelper(),
  close: () => controls?.closeHelper(),
  destroy,
};

function parseJson<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value !== 'false' && value !== '0';
}

function optionsFromDataset(script: HTMLScriptElement): AiHelperProps {
  const data = script.dataset;
  const suggestions = data.suggestions
    ?.split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  const theme = data.theme === 'light' || data.theme === 'auto' ? data.theme : 'dark';
  const position: AiHelperPosition =
    data.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  const zIndex = data.zIndex ? Number.parseInt(data.zIndex, 10) : undefined;
  const maxInputLength = data.maxInputLength
    ? Number.parseInt(data.maxInputLength, 10)
    : undefined;

  return {
    endpoint: data.endpoint || '/api/chat',
    title: data.title,
    subtitle: data.subtitle,
    logo: data.logo,
    welcomeMessage: data.welcomeMessage,
    suggestions,
    position,
    theme: theme as AiHelperTheme,
    accentColor: data.accent,
    persist: parseBoolean(data.persist, true),
    placeholder: data.placeholder,
    defaultOpen: parseBoolean(data.defaultOpen, false),
    assistantName: data.assistantName,
    hideSuggestionsAfterFirstMessage: data.hideSuggestionsAfterFirstMessage
      ? parseBoolean(data.hideSuggestionsAfterFirstMessage, true)
      : undefined,
    zIndex: Number.isFinite(zIndex) ? zIndex : undefined,
    maxInputLength: Number.isFinite(maxInputLength) ? maxInputLength : undefined,
    metadata: parseJson<Record<string, unknown>>(data.metadata),
    headers: parseJson<Record<string, string>>(data.headers),
  };
}

declare global {
  interface Window {
    AiHelper?: EmbedApi;
  }
}

const script = typeof document !== 'undefined' ? document.currentScript : null;

if (typeof window !== 'undefined') {
  window.AiHelper = api;

  const autoMount = () => {
    if (!(script instanceof HTMLScriptElement)) return;
    if (!parseBoolean(script.dataset.autoMount, true)) return;
    render(optionsFromDataset(script));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  } else {
    queueMicrotask(autoMount);
  }
}

export { api, destroy, render, lastOptions };
