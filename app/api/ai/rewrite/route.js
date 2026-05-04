import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are an elite wildlife content editor for Wildlife.Universe, a luxury nature publication. You rewrite text in the requested style without losing the writer's voice or factual accuracy. Output ONLY the rewritten text — no preamble, no labels, no quotation marks, no explanation.`;

const STYLE_INSTRUCTIONS = {
  fix_grammar: 'Fix all grammar, spelling, and punctuation errors. Keep meaning, voice, and length exactly the same.',
  shorter: 'Rewrite to be significantly shorter while preserving the key meaning and any wildlife-specific terms.',
  expand: 'Expand with more sensory detail, behavioral context, and ecological nuance. Maintain the wildlife/nature voice.',
  formal: 'Rewrite in a formal, authoritative tone befitting a National Geographic feature.',
  casual: 'Rewrite in a warm, conversational tone — like a naturalist guide chatting with safari guests.',
  improve: 'Improve clarity, flow, sentence variety, and word choice. Strengthen weak phrases without changing meaning.',
};

export async function POST(req) {
  try {
    const { text, style = 'improve', provider = 'claude' } = await req.json();
    if (!text || !text.trim()) {
      return Response.json({ success: false, error: 'Text is required' }, { status: 400 });
    }

    const instruction = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.improve;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: result } = await generateText({
      model,
      system: SYSTEM,
      prompt: `${instruction}\n\n${text.slice(0, 4000)}`,
      temperature: 0.5,
      maxTokens: 1500,
    });

    return Response.json({ success: true, data: { result: result.trim() } });
  } catch (err) {
    console.error('[AI Rewrite]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
