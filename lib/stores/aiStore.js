import { create } from 'zustand';

export const useAIStore = create((set, get) => ({
  // ── Provider ──────────────────────────────────────────────
  provider: 'claude', // 'claude' | 'openai'
  setProvider: (p) => set({ provider: p }),

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
}));
