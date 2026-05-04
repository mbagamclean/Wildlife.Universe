import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 90;

const SYSTEM = `You are a native-quality multilingual translator who specialises in editorial wildlife and nature content. You translate with a literary translator's ear: preserve the author's voice, register, and rhythm. You never paraphrase loosely — you render meaning faithfully. You leave proper nouns and Latin scientific binomials untranslated. You preserve any HTML tags exactly as they appear, translating only the text between tags. Return ONLY a single valid JSON object — no markdown fences, no preamble.`;

const SUPPORTED_LANGUAGES = {
  English:               'en',
  Spanish:               'es',
  French:                'fr',
  German:                'de',
  Portuguese:            'pt',
  Italian:               'it',
  Dutch:                 'nl',
  Swahili:               'sw',
  Arabic:                'ar',
  'Chinese (Simplified)':'zh-CN',
  Japanese:              'ja',
  Korean:                'ko',
  Hindi:                 'hi',
  Russian:               'ru',
  Turkish:               'tr',
};

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const {
      text,
      targetLanguage = 'English',
      preserveTone = true,
      provider = 'claude',
      model = null,
    } = await req.json();

    if (!text || !String(text).trim()) {
      return Response.json({ success: false, error: 'Text is required' }, { status: 400 });
    }
    if (!SUPPORTED_LANGUAGES[targetLanguage]) {
      return Response.json({ success: false, error: `Unsupported target language: ${targetLanguage}` }, { status: 400 });
    }

    const trimmed = String(text).slice(0, 16000);

    // English passthrough no-op (only when source is plain English-like text — we still ask the model to detect, but cheap-skip the call)
    if (targetLanguage === 'English' && /^[\x00-\x7F\s]*$/.test(trimmed.slice(0, 400))) {
      return Response.json({
        success: true,
        data: {
          translation: trimmed,
          sourceLanguage: 'English',
          notes: 'Source already appears to be English — no translation needed.',
        },
      });
    }

    const toneClause = preserveTone
      ? 'Preserve the original tone, voice, and idioms as faithfully as possible — translate idiom-for-idiom only when a near-equivalent exists in the target language; otherwise render meaning literally and add a brief inline note in the target language only if absolutely needed.'
      : 'Localise idioms, cultural references, and rhetorical flourishes naturally for a native speaker of the target language. Adapt tone to feel native, not translated.';

    const prompt = `Translate the text below into ${targetLanguage}.

Hard rules:
- ${toneClause}
- Preserve every HTML tag exactly (translate only the text content between tags)
- Do NOT translate proper nouns (people, places, organisations, brand names)
- Do NOT translate Latin scientific names (e.g. Panthera leo, Loxodonta africana)
- Do NOT add facts, opinions, or commentary not present in the original
- If the source contains markdown headings, lists, or links, preserve their structure exactly
- Output natural, flowing prose — never word-for-word

Return ONLY this JSON shape:
{
  "translation": "the full translated text",
  "sourceLanguage": "the detected source language name in English",
  "notes": "one short sentence about any translation choices a reader should know about (or empty string)"
}

Source text:
${trimmed}`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.3,
      maxTokens: 6000,
    });

    const parsed = extractJson(raw);
    const data = {
      translation: typeof parsed.translation === 'string' ? parsed.translation.trim() : '',
      sourceLanguage: String(parsed.sourceLanguage || 'Unknown').slice(0, 60),
      notes: String(parsed.notes || '').slice(0, 600),
    };

    if (!data.translation) throw new Error('Model returned no translation');

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Translate]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
