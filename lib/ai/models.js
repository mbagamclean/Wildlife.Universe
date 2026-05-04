/**
 * Model registry — single source of truth for which AI models the app
 * exposes in dropdowns and accepts at endpoints. Last updated 2026-05-04
 * from official docs (developers.openai.com, platform.claude.com,
 * ai.google.dev).
 *
 * Each entry shape:
 *   { id, label, tier, context, note, default? }
 *
 * Endpoints validate inbound `model` against the IDs listed here for
 * the relevant category — anything else is rejected and the default
 * is used.
 */

// ── OpenAI ──────────────────────────────────────────────────────────
export const OPENAI_TEXT_MODELS = [
  { id: 'gpt-5.5',        label: 'GPT-5.5',        tier: 'Flagship',  context: '1M',   note: 'Max intelligence — highest reasoning. Premium pricing.' },
  { id: 'gpt-5.4',        label: 'GPT-5.4',        tier: 'Balanced',  context: '1M',   note: 'Balanced flagship — recommended default.', default: true },
  { id: 'gpt-5.4-mini',   label: 'GPT-5.4 Mini',   tier: 'Mini',      context: '400k', note: 'Fast and capable — high-volume use.' },
  { id: 'gpt-5.4-nano',   label: 'GPT-5.4 Nano',   tier: 'Nano',      context: '400k', note: 'Cheapest, fastest. Classification, extraction.' },
  { id: 'gpt-4o',         label: 'GPT-4o (legacy)',tier: 'Legacy',    context: '128k', note: 'Older flagship — sunsetting Oct 2026.' },
  { id: 'gpt-4o-mini',    label: 'GPT-4o Mini (legacy)', tier: 'Legacy', context: '128k', note: 'Older mini — sunsetting Oct 2026.' },
];

export const OPENAI_TTS_MODELS = [
  { id: 'gpt-4o-mini-tts', label: 'GPT-4o Mini TTS', tier: 'Latest',  note: 'Newest, supports instruction prompts (accent/emotion).', default: true },
  { id: 'tts-1-hd',        label: 'TTS-1 HD',        tier: 'Quality', note: 'Higher quality classic.' },
  { id: 'tts-1',           label: 'TTS-1',           tier: 'Cost',    note: 'Lower latency, cost-optimized.' },
];

export const OPENAI_TTS_VOICES = [
  // 13 voices total. tts-1 / tts-1-hd only support the first 9 (no ballad/marin/cedar).
  { id: 'alloy',   label: 'Alloy',   note: 'Neutral, versatile.' },
  { id: 'echo',    label: 'Echo',    note: 'Calm and clear.' },
  { id: 'fable',   label: 'Fable',   note: 'Warm storyteller.' },
  { id: 'onyx',    label: 'Onyx',    note: 'Deep authoritative.' },
  { id: 'nova',    label: 'Nova',    note: 'Bright and engaging.', default: true },
  { id: 'shimmer', label: 'Shimmer', note: 'Soft and friendly.' },
  { id: 'ash',     label: 'Ash',     note: 'Confident steady.' },
  { id: 'coral',   label: 'Coral',   note: 'Lively and warm.' },
  { id: 'sage',    label: 'Sage',    note: 'Thoughtful pacing.' },
  { id: 'ballad',  label: 'Ballad',  note: 'Lyrical (gpt-4o-mini-tts only).' },
  { id: 'verse',   label: 'Verse',   note: 'Rhythmic (gpt-4o-mini-tts only).' },
  { id: 'marin',   label: 'Marin',   note: 'Best-quality narration (gpt-4o-mini-tts only).' },
  { id: 'cedar',   label: 'Cedar',   note: 'Best-quality narration (gpt-4o-mini-tts only).' },
];

export const OPENAI_TRANSCRIBE_MODELS = [
  { id: 'gpt-4o-transcribe',         label: 'GPT-4o Transcribe',       tier: 'Latest',  note: 'Best general transcription.', default: true },
  { id: 'gpt-4o-mini-transcribe',    label: 'GPT-4o Mini Transcribe',  tier: 'Cost',    note: 'Cheaper variant.' },
  { id: 'gpt-4o-transcribe-diarize', label: 'GPT-4o Transcribe + Diarize', tier: 'Advanced', note: 'Adds speaker diarization.' },
  { id: 'whisper-1',                 label: 'Whisper-1 (legacy)',      tier: 'Legacy',  note: 'Required only for translations endpoint.' },
];

export const OPENAI_IMAGE_MODELS = [
  { id: 'gpt-image-2',      label: 'GPT-Image 2',     tier: 'Latest',  note: 'State-of-the-art generation + editing.', default: true },
  { id: 'gpt-image-1',      label: 'GPT-Image 1',     tier: 'Legacy',  note: 'Sunsetting Oct 2026.' },
  { id: 'gpt-image-1-mini', label: 'GPT-Image 1 Mini',tier: 'Cost',    note: 'Cheaper image gen.' },
];

// ── Anthropic ───────────────────────────────────────────────────────
export const ANTHROPIC_TEXT_MODELS = [
  { id: 'claude-opus-4-7',   label: 'Claude Opus 4.7',   tier: 'Flagship', context: '1M',   note: 'Most capable. Adaptive thinking only.', default: true },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'Balanced', context: '1M',   note: 'Best speed/intelligence trade-off.' },
  { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  tier: 'Fast',     context: '200k', note: 'Fastest, cheapest. Near-frontier.' },
  { id: 'claude-opus-4-6',   label: 'Claude Opus 4.6',   tier: 'Legacy',   context: '1M',   note: 'Previous flagship. Manual extended thinking supported.' },
];

// ── Google Gemini ───────────────────────────────────────────────────
export const GEMINI_TEXT_MODELS = [
  { id: 'gemini-3-flash-preview',         label: 'Gemini 3 Flash',         tier: 'Latest',  note: 'Frontier-class, preview.' },
  { id: 'gemini-3.1-pro-preview',         label: 'Gemini 3.1 Pro',         tier: 'Pro',     note: 'Top of Gemini 3, preview.' },
  { id: 'gemini-3.1-flash-lite-preview',  label: 'Gemini 3.1 Flash Lite',  tier: 'Lite',    note: 'Cheap+fast, preview.' },
  { id: 'gemini-2.5-pro',                 label: 'Gemini 2.5 Pro',         tier: 'GA',      note: 'Stable. Long context.', default: true },
  { id: 'gemini-2.5-flash',               label: 'Gemini 2.5 Flash',       tier: 'GA',      note: 'Stable, balanced.' },
  { id: 'gemini-2.5-flash-lite',          label: 'Gemini 2.5 Flash Lite',  tier: 'GA',      note: 'Cheapest stable tier.' },
];

export const GEMINI_IMAGE_MODELS = [
  { id: 'gemini-3-pro-image-preview',     label: 'Nano Banana Pro',     tier: 'Premium',  note: 'Highest quality. Up to 4K, legible text.' },
  { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2',       tier: 'Latest',   note: 'Fast preview, current default.', default: true },
  { id: 'gemini-2.5-flash-image',         label: 'Nano Banana (GA)',    tier: 'Stable',   note: 'Only GA image model.' },
];

// ── Helpers ─────────────────────────────────────────────────────────
function defaultOf(list) {
  return (list.find((m) => m.default) || list[0]).id;
}

export const DEFAULTS = {
  openaiText:        defaultOf(OPENAI_TEXT_MODELS),       // gpt-5.4
  openaiTts:         defaultOf(OPENAI_TTS_MODELS),        // gpt-4o-mini-tts
  openaiVoice:       defaultOf(OPENAI_TTS_VOICES),        // nova
  openaiTranscribe:  defaultOf(OPENAI_TRANSCRIBE_MODELS), // gpt-4o-transcribe
  openaiImage:       defaultOf(OPENAI_IMAGE_MODELS),      // gpt-image-2
  anthropicText:     defaultOf(ANTHROPIC_TEXT_MODELS),    // claude-opus-4-7
  geminiText:        defaultOf(GEMINI_TEXT_MODELS),       // gemini-2.5-pro
  geminiImage:       defaultOf(GEMINI_IMAGE_MODELS),      // gemini-3.1-flash-image-preview
};

const ALL_IDS_BY_CATEGORY = {
  openaiText:       new Set(OPENAI_TEXT_MODELS.map((m) => m.id)),
  openaiTts:        new Set(OPENAI_TTS_MODELS.map((m) => m.id)),
  openaiVoice:      new Set(OPENAI_TTS_VOICES.map((m) => m.id)),
  openaiTranscribe: new Set(OPENAI_TRANSCRIBE_MODELS.map((m) => m.id)),
  openaiImage:      new Set(OPENAI_IMAGE_MODELS.map((m) => m.id)),
  anthropicText:    new Set(ANTHROPIC_TEXT_MODELS.map((m) => m.id)),
  geminiText:       new Set(GEMINI_TEXT_MODELS.map((m) => m.id)),
  geminiImage:      new Set(GEMINI_IMAGE_MODELS.map((m) => m.id)),
};

/**
 * Validate a model ID against the registry. If valid, return it.
 * Otherwise return the default for the category.
 *
 * Endpoints call this so users (or attackers) can't spam arbitrary
 * model IDs into the SDK call.
 */
export function resolveModel(category, requested) {
  if (requested && ALL_IDS_BY_CATEGORY[category]?.has(requested)) {
    return requested;
  }
  return DEFAULTS[category];
}

/**
 * Resolve text model based on provider + override.
 * Backwards compatible with endpoints that already pass `provider`.
 */
export function resolveTextModel({ provider, model } = {}) {
  if (provider === 'openai') {
    return {
      provider: 'openai',
      modelId: resolveModel('openaiText', model),
    };
  }
  return {
    provider: 'anthropic',
    modelId: resolveModel('anthropicText', model),
  };
}
