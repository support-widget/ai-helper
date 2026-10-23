import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from '../src/markdown';

describe('Markdown', () => {
  it('renders headings, emphasis, lists, inline code, and fenced code blocks as React nodes', () => {
    const { container } = render(
      <Markdown
        content={[
          '## Install',
          '',
          'Run **npm i** or *pnpm add* and then `init()`.',
          '',
          '- one',
          '- two',
          '',
          '```ts',
          'const x = 1;',
          '```',
        ].join('\n')}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Install' })).toBeInTheDocument();
    expect(screen.getByText('npm i').tagName.toLowerCase()).toBe('strong');
    expect(screen.getByText('pnpm add').tagName.toLowerCase()).toBe('em');
    expect(screen.getByText('init()').tagName.toLowerCase()).toBe('code');
    expect(screen.getByText('one').closest('ul')).toBeInTheDocument();
    expect(container.querySelector('pre code')?.textContent).toBe('const x = 1;');
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('opens links in a new tab with noopener noreferrer', () => {
    render(<Markdown content={'Read [the docs](https://example.com/docs).'} />);
    const link = screen.getByRole('link', { name: 'the docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not create links for unsafe protocols', () => {
    render(<Markdown content={'[bad](javascript:alert)'} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('[bad](javascript:alert)')).toBeInTheDocument();
  });

  it('renders raw HTML as text instead of injecting it', () => {
    const { container } = render(
      <Markdown content={'<img src=x onerror="alert(1)"> <script>alert(1)</script>'} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<img');
  });
});
