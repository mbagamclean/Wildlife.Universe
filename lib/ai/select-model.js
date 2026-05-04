import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { resolveModel } from './models';

/**
 * Resolve { provider, model } from a request body into a Vercel AI SDK
 * model client. Validates the requested model against the registry —
 * unknown IDs fall back to the registered default for the category.
 *
 *   const aiModel = pickTextModel({ provider, model });
 *   const { text } = await generateText({ model: aiModel, ... });
 */
export function pickTextModel({ provider, model } = {}) {
  if (provider === 'openai') {
    return openai(resolveModel('openaiText', model));
  }
  return anthropic(resolveModel('anthropicText', model));
}
