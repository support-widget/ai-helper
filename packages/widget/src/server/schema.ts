import { z } from 'zod';

export const requestSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ParsedRequest = z.infer<typeof requestSchema>;
