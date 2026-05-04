import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULTS } from '@/lib/ai/models';

export const useAIStore = create(
  persist(
    (set, get) => ({
  // ── Provider + per-provider model selection (persisted) ───
  provider: 'claude', // 'claude' | 'openai'
  setProvider: (p) => set({ provider: p }),

  claudeModel:        DEFAULTS.anthropicText,    // claude-opus-4-7
  openaiModel:        DEFAULTS.openaiText,       // gpt-5.4
  openaiTtsModel:     DEFAULTS.openaiTts,        // gpt-4o-mini-tts
  openaiTtsVoice:     DEFAULTS.openaiVoice,      // nova
  openaiTranscribeModel: DEFAULTS.openaiTranscribe, // gpt-4o-transcribe
  openaiImageModel:   DEFAULTS.openaiImage,      // gpt-image-2
  geminiTextModel:    DEFAULTS.geminiText,       // gemini-2.5-pro
  geminiImageModel:   DEFAULTS.geminiImage,      // gemini-3.1-flash-image-preview

  setModel: (key, value) => set({ [key]: value }),

  /** Currently-selected text model id for the active provider. */
  getCurrentTextModel: () => {
    const s = get();
    return s.provider === 'openai' ? s.openaiModel : s.claudeModel;
  },

  // ── Writing ───────────────────────────────────────────────
  selectedTones: ['Professional'],
  toneIntensity: 70,
  activeWritingTab: 'Generate', // Generate | Enhance | Structure | Snippets | Research | EEAT | AdSense
  generatingTask: null,
  streamedContent: '',
  generatedContent: '',
  isStreaming: false,
  streamController: null,

  setTone: (tone) =>
    set((s) => ({
      selectedTones: s.selectedTones.includes(tone)
        ? s.selectedTones.filter((t) => t !== tone)
        : [...s.selectedTones, tone].slice(-2),
    })),
  setToneIntensity: (v) => set({ toneIntensity: v }),
  setActiveWritingTab: (t) => set({ activeWritingTab: t }),

  startStream: (task) => set({ isStreaming: true, generatingTask: task, streamedContent: '' }),
  appendStream: (chunk) =>
    set((s) => ({ streamedContent: s.streamedContent + chunk })),
  finishStream: () =>
    set((s) => ({
      isStreaming: false,
      generatedContent: s.streamedContent,
      generatingTask: null,
    })),
  cancelStream: () => {
    get().streamController?.abort();
    set({ isStreaming: false, generatingTask: null });
  },
  setStreamController: (ctrl) => set({ streamController: ctrl }),
  clearGenerated: () => set({ generatedContent: '', streamedContent: '' }),

  // ── SEO ───────────────────────────────────────────────────
  seoTitle: '',
  metaDescription: '',
  keywords: '',
  seoExcerpt: '',
  isGeneratingSEO: false,
  seoAnalysis: null,

  setSEOField: (field, value) => set({ [field]: value }),
  setAllSEOFields: (fields) => set(fields),
  setIsGeneratingSEO: (v) => set({ isGeneratingSEO: v }),
  setSeoAnalysis: (data) => set({ seoAnalysis: data }),
  clearSEO: () =>
    set({ seoTitle: '', metaDescription: '', keywords: '', seoExcerpt: '', seoAnalysis: null }),

  // ── Editor AI extensions (rewrite, proof, plagiarism, headlines) ──
  rewriteResult: null,        // { result: string }
  setRewriteResult: (v) => set({ rewriteResult: v }),
  proofreadResult: null,      // { corrected, corrections, summary }
  setProofreadResult: (v) => set({ proofreadResult: v }),
  plagiarismResult: null,     // { originalityScore, status, verdict, ... }
  setPlagiarismResult: (v) => set({ plagiarismResult: v }),
  headlineResults: [],        // [{ headline, type, primaryKeyword, searchVolume, estimatedWordCount }]
  setHeadlineResults: (v) => set({ headlineResults: Array.isArray(v) ? v : [] }),

  // ── Image ─────────────────────────────────────────────────
  imageProvider: 'openai', // 'openai' | 'gemini'
  imagePrompt: '',
  transformPrompt: '',
  transformSourceUrl: '',
  generatedImages: [],
  isGeneratingImage: false,
  bulkJobs: [], // [{ heading, context, status, imageUrl, error }]
  isBulkRunning: false,

  setImageProvider: (p) => set({ imageProvider: p }),
  setImagePrompt: (p) => set({ imagePrompt: p }),
  setTransformPrompt: (p) => set({ transformPrompt: p }),
  setTransformSourceUrl: (u) => set({ transformSourceUrl: u }),
  setIsGeneratingImage: (v) => set({ isGeneratingImage: v }),
  addGeneratedImage: (img) =>
    set((s) => ({ generatedImages: [img, ...s.generatedImages].slice(0, 20) })),
  setBulkJobs: (jobs) => set({ bulkJobs: jobs }),
  updateBulkJob: (idx, patch) =>
    set((s) => ({
      bulkJobs: s.bulkJobs.map((j, i) => (i === idx ? { ...j, ...patch } : j)),
    })),
  setIsBulkRunning: (v) => set({ isBulkRunning: v }),

  // ── Audio / Media ─────────────────────────────────────────
  audioVoice: 'nova',           // alloy | echo | fable | onyx | nova | shimmer
  audioSpeed: 1.0,              // 0.5 – 2.0
  voiceoverChunks: [],          // [{ index, url, text, durationEstimate, error? }]
  isGeneratingVoiceover: false,
  subtitlesVTT: '',
  subtitlesCues: [],            // [{ start, end, text }]
  isGeneratingSubtitles: false,
  transcript: '',
  transcriptSegments: [],       // [{ start, end, text }]
  isTranscribing: false,
  shortsScript: null,           // { hook, script: [...], hashtags, totalDurationSec, captions }
  isGeneratingShorts: false,

  setAudioVoice: (v) => set({ audioVoice: v }),
  setAudioSpeed: (v) => set({ audioSpeed: Number(v) || 1 }),
  setVoiceoverChunks: (chunks) => set({ voiceoverChunks: Array.isArray(chunks) ? chunks : [] }),
  setIsGeneratingVoiceover: (v) => set({ isGeneratingVoiceover: !!v }),
  setSubtitles: ({ vtt = '', cues = [] } = {}) => set({ subtitlesVTT: vtt, subtitlesCues: cues }),
  setIsGeneratingSubtitles: (v) => set({ isGeneratingSubtitles: !!v }),
  setTranscript: ({ transcript = '', segments = [] } = {}) =>
    set({ transcript, transcriptSegments: Array.isArray(segments) ? segments : [] }),
  setIsTranscribing: (v) => set({ isTranscribing: !!v }),
  setShortsScript: (v) => set({ shortsScript: v }),
  setIsGeneratingShorts: (v) => set({ isGeneratingShorts: !!v }),
  clearMedia: () =>
    set({
      voiceoverChunks: [], subtitlesVTT: '', subtitlesCues: [],
      transcript: '', transcriptSegments: [], shortsScript: null,
    }),
    }),
    {
      name: 'wu-ai-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : undefined)),
      // Only persist user-pickable preferences. Ephemeral runtime
      // state (streams, results) stays in-memory.
      partialize: (s) => ({
        provider: s.provider,
        claudeModel: s.claudeModel,
        openaiModel: s.openaiModel,
        openaiTtsModel: s.openaiTtsModel,
        openaiTtsVoice: s.openaiTtsVoice,
        openaiTranscribeModel: s.openaiTranscribeModel,
        openaiImageModel: s.openaiImageModel,
        geminiTextModel: s.geminiTextModel,
        geminiImageModel: s.geminiImageModel,
        selectedTones: s.selectedTones,
        toneIntensity: s.toneIntensity,
        audioVoice: s.audioVoice,
        audioSpeed: s.audioSpeed,
      }),
    }
  )
);
