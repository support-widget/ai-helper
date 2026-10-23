import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatProvider,
  ProviderInput,
  ProviderOptions,
  ProviderStreamEvent,
} from './types';

/**
 * The bundled Anthropic provider. The API key is only read on the server.
 */
export function createAnthropicProvider(options: ProviderOptions): ChatProvider {
  const client = new Anthropic({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    maxRetries: options.maxRetries ?? 1,
  });

  return {
    name: 'anthropic',
    async *stream(input: ProviderInput): AsyncIterable<ProviderStreamEvent> {
      const stream = client.messages.stream(
        {
          model: input.model,
          max_tokens: input.maxTokens,
          system: input.system,
          messages: input.messages,
        },
        { signal: input.signal },
      );

      let finishReason: string | undefined;
      let usage: unknown;

      for await (const event of stream) {
        if (input.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (event.type === 'message_start') {
          usage = event.message.usage;
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          if (event.delta.text) yield { type: 'text', text: event.delta.text };
        } else if (event.type === 'message_delta') {
          finishReason = event.delta.stop_reason ?? undefined;
          usage = event.usage;
        }
      }

      yield {
        type: 'done',
        finishReason: finishReason ?? 'stop',
        usage,
      };
    },
  };
}

export type { ProviderStreamEvent };
