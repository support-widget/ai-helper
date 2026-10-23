import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiHelper } from '../src/AiHelper';
import { AiHelperProvider, useAiHelperControls } from '../src/provider';
import { completedResponse, jsonResponse } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function shadowScope() {
  await waitFor(() => {
    expect(document.querySelector('[data-ai-helper]')?.shadowRoot).toBeTruthy();
  });
  const host = document.querySelector('[data-ai-helper]') as HTMLElement;
  const shadow = host.shadowRoot;
  if (!shadow) throw new Error('Shadow root missing');
  return { shadow, scope: within(shadow as unknown as HTMLElement) };
}

describe('<AiHelper />', () => {
  it('opens the dialog, focuses the input, and returns focus on Escape', async () => {
    const onOpenChange = vi.fn();
    const { shadow, scope } = await (async () => {
      render(
        <AiHelper
          title="Acme help"
          suggestions={['How do I install it?']}
          persist={false}
          onOpenChange={onOpenChange}
        />,
      );
      return shadowScope();
    })();

    const launcher = scope.getByRole('button', { name: 'Open Acme help' });
    fireEvent.click(launcher);

    const dialog = scope.getByRole('dialog', { name: 'Acme help chat' });
    expect(dialog).toBeInTheDocument();
    expect(launcher).toHaveAttribute('aria-expanded', 'true');

    const input = scope.getByRole('textbox', { name: 'Ask a question' });
    await waitFor(() => expect(shadow.activeElement).toBe(input));

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(scope.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(shadow.activeElement).toBe(launcher));
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('sends a suggested question and hides chips after the first user message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedResponse('Run **npm i** first.'));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AiHelper
        title="Acme help"
        suggestions={['How do I install it?', 'Is there a free plan?']}
        persist={false}
      />,
    );
    const { scope } = await shadowScope();
    fireEvent.click(scope.getByRole('button', { name: 'Open Acme help' }));
    fireEvent.click(scope.getByRole('button', { name: 'How do I install it?' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(scope.getByText('npm i').tagName.toLowerCase()).toBe('strong'),
    );
    expect(scope.queryByRole('button', { name: 'How do I install it?' })).not.toBeInTheDocument();
  });

  it('sends on Enter and keeps Shift+Enter as a newline', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedResponse('Answer'));
    vi.stubGlobal('fetch', fetchMock);
    render(<AiHelper title="Acme help" persist={false} />);
    const { scope } = await shadowScope();
    fireEvent.click(scope.getByRole('button', { name: 'Open Acme help' }));

    const input = scope.getByRole('textbox', { name: 'Ask a question' }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'line one' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Send this' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('shows an error card with a working retry action', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'server_error', message: 'Upstream failed.' } },
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(completedResponse('Recovered now'));
    vi.stubGlobal('fetch', fetchMock);

    render(<AiHelper title="Acme help" persist={false} />);
    const { scope } = await shadowScope();
    fireEvent.click(scope.getByRole('button', { name: 'Open Acme help' }));
    const input = scope.getByRole('textbox', { name: 'Ask a question' });
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(scope.getByRole('alert')).toBeInTheDocument());
    const retry = scope.getByRole('button', { name: 'Retry' });
    fireEvent.click(retry);

    await waitFor(() => expect(scope.getByText('Recovered now')).toBeInTheDocument());
    expect(scope.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('supports programmatic open and close through the provider', async () => {
    function Controls() {
      const { openHelper, closeHelper } = useAiHelperControls();
      return (
        <>
          <button type="button" onClick={openHelper}>
            Open programmatically
          </button>
          <button type="button" onClick={closeHelper}>
            Close programmatically
          </button>
        </>
      );
    }

    render(
      <AiHelperProvider>
        <Controls />
        <AiHelper title="Acme help" persist={false} />
      </AiHelperProvider>,
    );
    const { scope } = await shadowScope();

    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    expect(scope.getByRole('dialog', { name: 'Acme help chat' })).toBeInTheDocument();

    fireEvent.click(document.querySelectorAll('button')[1] as HTMLButtonElement);
    await waitFor(() => expect(scope.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('uses full-screen/mobile-safe markup hooks and an accessible live region', async () => {
    render(
      <AiHelper
        title="Acme help"
        suggestions={['How do I install it?']}
        persist={false}
        defaultOpen
      />,
    );
    const { scope } = await shadowScope();
    const log = scope.getByLabelText('Conversation');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(scope.getByRole('dialog')).toHaveAttribute('aria-label', 'Acme help chat');
    expect(scope.getByLabelText('Suggested questions')).toBeInTheDocument();
  });
});
