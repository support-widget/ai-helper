'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { isSafeHref } from './utils';

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'hr' };

function isFence(line: string): RegExpMatchArray | null {
  return line.match(/^\s*```([\w.+-]*)\s*$/);
}

function startsBlock(line: string): boolean {
  return (
    isFence(line) !== null ||
    /^\s{0,3}#{1,6}\s+/.test(line) ||
    /^\s{0,3}(?:[-*+]|\d+[.)])\s+/.test(line) ||
    /^\s{0,3}>\s?/.test(line) ||
    /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)
  );
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = isFence(line);
    if (fence) {
      const language = fence[1] ?? '';
      index += 1;
      const code: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? '';
        if (/^\s*```\s*$/.test(current)) {
          index += 1;
          break;
        }
        code.push(current);
        index += 1;
      }
      blocks.push({ type: 'code', language, code: code.join('\n') });
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]?.length ?? 1,
        text: heading[2] ?? '',
      });
      index += 1;
      continue;
    }

    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const unordered = line.match(/^\s{0,3}[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s{0,3}\d+[.)]\s+(.*)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? '';
        const match = isOrdered
          ? current.match(/^\s{0,3}\d+[.)]\s+(.*)$/)
          : current.match(/^\s{0,3}[-*+]\s+(.*)$/);
        if (!match) break;
        items.push(match[1] ?? '');
        index += 1;
      }
      blocks.push({ type: 'list', ordered: isOrdered, items });
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? '';
        const match = current.match(/^\s{0,3}>\s?(.*)$/);
        if (!match) break;
        quote.push(match[1] ?? '');
        index += 1;
      }
      blocks.push({ type: 'quote', text: quote.join('\n') });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (!current.trim() || startsBlock(current)) break;
      paragraph.push(current);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
  }

  return blocks;
}

function renderText(text: string, key: string): ReactNode {
  if (!text.includes('\n')) return text;
  return (
    <Fragment key={key}>
      {text.split('\n').map((line, index) => (
        <Fragment key={`${key}-line-${index}`}>
          {index > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </Fragment>
  );
}

const INLINE_PATTERN =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(~~[^~\n]+~~)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\([^)\s]+\))/g;

/**
 * A deliberately small Markdown renderer. It produces React elements only,
 * so raw HTML in model output is displayed as text and never executed.
 */
export function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(INLINE_PATTERN);

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(renderText(text.slice(cursor, match.index), `${keyPrefix}-t-${cursor}`));
    }
    const token = match[0];
    const key = `${keyPrefix}-m-${match.index}`;

    if (token.startsWith('`')) {
      nodes.push(
        <code className="aih-inline-code" key={key}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key}>{renderInline(token.slice(2, -2), key)}</del>);
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = link?.[2]?.trim() ?? '';
      if (!link || !isSafeHref(href)) {
        nodes.push(renderText(token, key));
      } else {
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            {renderInline(link[1] ?? '', `${key}-link`)}
          </a>,
        );
      }
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(renderText(text.slice(cursor), `${keyPrefix}-t-${cursor}`));
  }
  return nodes;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setState('copied');
      window.setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('failed');
      window.setTimeout(() => setState('idle'), 1600);
    }
  };

  return (
    <div className="aih-code">
      <div className="aih-code-head">
        <span className="aih-code-lang">{language || 'code'}</span>
        <button
          type="button"
          className="aih-copy"
          onClick={copy}
          aria-label={state === 'copied' ? 'Code copied' : 'Copy code'}
        >
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="aih-markdown">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case 'code':
            return <CodeBlock key={key} code={block.code} language={block.language} />;
          case 'heading': {
            const level = Math.min(Math.max(block.level, 1), 6);
            const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            return <Tag key={key}>{renderInline(block.text, key)}</Tag>;
          }
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <Tag key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </Tag>
            );
          }
          case 'quote':
            return <blockquote key={key}>{renderInline(block.text, key)}</blockquote>;
          case 'hr':
            return <hr key={key} />;
          case 'paragraph':
          default:
            return <p key={key}>{renderInline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}
