'use client';

import { useEffect, useState } from 'react';
import {
  Loader2, KeyRound, Check, AlertCircle, ExternalLink, Save, ShieldCheck, Cpu, Sparkles,
} from 'lucide-react';
import { ProviderLogo, PROVIDER_META } from '@/components/ai/ProviderLogo';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { useAIStore } from '@/lib/stores/aiStore';
import {
  OPENAI_TEXT_MODELS, OPENAI_TTS_MODELS, OPENAI_TTS_VOICES,
  OPENAI_TRANSCRIBE_MODELS, OPENAI_IMAGE_MODELS,
  ANTHROPIC_TEXT_MODELS,
  GEMINI_TEXT_MODELS, GEMINI_IMAGE_MODELS,
  DEFAULTS,
} from '@/lib/ai/models';

const PROVIDERS = [
  {
    id: 'anthropic',
    keyEnvVar: 'ANTHROPIC_API_KEY',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://platform.claude.com/docs/en/intro',
    accent: PROVIDER_META.anthropic.color,
  },
  {
    id: 'openai',
    keyEnvVar: 'OPENAI_API_KEY',
    consoleUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://developers.openai.com/api/docs',
    accent: '#10a37f',
  },
  {
    id: 'gemini',
    keyEnvVar: 'GEMINI_API_KEY',
    consoleUrl: 'https://aistudio.google.com/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    accent: PROVIDER_META.gemini.color,
  },
];

export function AIProviderSettings() {
  const store = useAIStore();
  const [active, setActive] = useState('anthropic');
  const [keyStatus, setKeyStatus] = useState({ loading: true, anthropic: null, openai: null, gemini: null });
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/ai/keys-check')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j?.success && j.data) {
          setKeyStatus({
            loading: false,
            anthropic: !!j.data.anthropic,
            openai:    !!j.data.openai,
            gemini:    !!j.data.gemini,
          });
        } else {
          setKeyStatus({ loading: false, anthropic: null, openai: null, gemini: null });
        }
      })
      .catch(() => alive && setKeyStatus({ loading: false, anthropic: null, openai: null, gemini: null }));
    return () => { alive = false; };
  }, []);

  const flash = (msg) => {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2200);
  };

  const reset = () => {
    store.setModel('claudeModel', DEFAULTS.anthropicText);
    store.setModel('openaiModel', DEFAULTS.openaiText);
    store.setModel('openaiTtsModel', DEFAULTS.openaiTts);
    store.setModel('openaiTtsVoice', DEFAULTS.openaiVoice);
    store.setModel('openaiTranscribeModel', DEFAULTS.openaiTranscribe);
    store.setModel('openaiImageModel', DEFAULTS.openaiImage);
    store.setModel('geminiTextModel', DEFAULTS.geminiText);
    store.setModel('geminiImageModel', DEFAULTS.geminiImage);
    flash('Defaults restored.');
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="CONFIGURATION"
        title="AI Providers"
        description="Pick the default model for each provider. Selections persist in your browser and are sent with every AI request."
        icon={Cpu}
        accent="#7c3aed"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {PROVIDERS.map((p) => {
          const meta = PROVIDER_META[p.id];
          const isActive = active === p.id;
          const present = keyStatus[p.id];
          return (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 12,
                border: `1.5px solid ${isActive ? p.accent : 'var(--adm-border)'}`,
                background: isActive ? `${p.accent}10` : 'transparent',
                color: isActive ? p.accent : 'var(--adm-text)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <ProviderLogo provider={p.id} size={18} />
              {meta.name}
              {keyStatus.loading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : present === true ? (
                <ShieldCheck size={12} style={{ color: '#16a34a' }} />
              ) : present === false ? (
                <AlertCircle size={12} style={{ color: '#dc2626' }} />
              ) : null}
            </button>
          );
        })}
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
             style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
          <Check size={14} /> {saved}
        </div>
      )}

      {active === 'anthropic' && (
        <ProviderPanel providerId="anthropic" present={keyStatus.anthropic}>
          <ModelDropdown
            label="Default text model"
            description="Used by every text-generating tool (write, SEO, headlines, proof, originality, AdSense, internal links, humanize, translate, etc.)."
            value={store.claudeModel}
            options={ANTHROPIC_TEXT_MODELS}
            onChange={(v) => { store.setModel('claudeModel', v); flash('Anthropic text model saved.'); }}
            recommended="claude-opus-4-7"
          />
        </ProviderPanel>
      )}

      {active === 'openai' && (
        <ProviderPanel providerId="openai" present={keyStatus.openai}>
          <ModelDropdown
            label="Default text model"
            description="Used when 'OpenAI' is selected as the active provider in the editor."
            value={store.openaiModel}
            options={OPENAI_TEXT_MODELS}
            onChange={(v) => { store.setModel('openaiModel', v); flash('OpenAI text model saved.'); }}
            recommended="gpt-5.4"
          />
          <ModelDropdown
            label="Text-to-speech (TTS) model"
            description="Used by AI Media → Voiceover and quick TTS."
            value={store.openaiTtsModel}
            options={OPENAI_TTS_MODELS}
            onChange={(v) => { store.setModel('openaiTtsModel', v); flash('TTS model saved.'); }}
            recommended="gpt-4o-mini-tts"
          />
          <ModelDropdown
            label="TTS voice"
            description="13 voices total. tts-1 / tts-1-hd only support the first 9. marin and cedar are docs-recommended for best narration."
            value={store.openaiTtsVoice}
            options={OPENAI_TTS_VOICES}
            onChange={(v) => { store.setModel('openaiTtsVoice', v); flash('Voice saved.'); }}
            recommended="nova"
          />
          <ModelDropdown
            label="Transcription (speech-to-text)"
            description="Used by AI Media → Transcribe."
            value={store.openaiTranscribeModel}
            options={OPENAI_TRANSCRIBE_MODELS}
            onChange={(v) => { store.setModel('openaiTranscribeModel', v); flash('Transcribe model saved.'); }}
            recommended="gpt-4o-transcribe"
          />
          <ModelDropdown
            label="Image generation"
            description="Future use — current image generation routes through Gemini by default."
            value={store.openaiImageModel}
            options={OPENAI_IMAGE_MODELS}
            onChange={(v) => { store.setModel('openaiImageModel', v); flash('OpenAI image model saved.'); }}
            recommended="gpt-image-2"
          />
        </ProviderPanel>
      )}

      {active === 'gemini' && (
        <ProviderPanel providerId="gemini" present={keyStatus.gemini}>
          <ModelDropdown
            label="Default text model"
            description="Future use — Wildlife.Universe currently routes text through Anthropic/OpenAI."
            value={store.geminiTextModel}
            options={GEMINI_TEXT_MODELS}
            onChange={(v) => { store.setModel('geminiTextModel', v); flash('Gemini text model saved.'); }}
            recommended="gemini-2.5-pro"
          />
          <ModelDropdown
            label="Image generation model"
            description="Used by AI Image Generator."
            value={store.geminiImageModel}
            options={GEMINI_IMAGE_MODELS}
            onChange={(v) => { store.setModel('geminiImageModel', v); flash('Gemini image model saved.'); }}
            recommended="gemini-3.1-flash-image-preview"
          />
        </ProviderPanel>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--adm-text-subtle)' }}>
        <Save size={12} />
        Saved automatically to your browser. Server validates every request against the same model registry.
        <button
          onClick={reset}
          className="ml-auto rounded-lg border px-3 py-1.5 font-semibold transition-colors"
          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
        >
          Reset to recommended defaults
        </button>
      </div>
    </div>
  );
}

function ProviderPanel({ providerId, present, children }) {
  const meta = PROVIDER_META[providerId];
  const provider = PROVIDERS.find((p) => p.id === providerId);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
        boxShadow: 'var(--adm-shadow)',
      }}
    >
      <div className="mb-4 flex items-start gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${provider.accent}1a`, border: `1px solid ${provider.accent}30` }}
        >
          <ProviderLogo provider={providerId} size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>{meta.name}</h2>
          <p className="text-xs" style={{ color: 'var(--adm-text-subtle)' }}>
            <code style={{ background: 'var(--adm-hover-bg)', padding: '1px 5px', borderRadius: 4 }}>{provider.keyEnvVar}</code>{' '}
            {present === true && <span style={{ color: '#16a34a', fontWeight: 700 }}>configured ✓</span>}
            {present === false && <span style={{ color: '#dc2626', fontWeight: 700 }}>missing</span>}
            {present === null && <span>status unknown</span>}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <a href={provider.consoleUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 font-semibold hover:underline"
               style={{ color: provider.accent }}>
              <KeyRound size={11} /> Get API key <ExternalLink size={10} />
            </a>
            <a href={provider.docsUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 font-semibold hover:underline"
               style={{ color: 'var(--adm-text-muted)' }}>
              <Sparkles size={11} /> Docs <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function ModelDropdown({ label, description, value, options, onChange, recommended }) {
  const selected = options.find((o) => o.id === value) || options[0];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
          {label}
        </label>
        {recommended && value !== recommended && (
          <button
            onClick={() => onChange(recommended)}
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
            style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed' }}
          >
            Use recommended
          </button>
        )}
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7c3aed]"
        style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}{o.tier ? ` · ${o.tier}` : ''}{o.context ? ` · ${o.context}` : ''}
          </option>
        ))}
      </select>
      {description && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{description}</p>
      )}
      {selected?.note && (
        <p className="mt-1 text-[11px] italic" style={{ color: 'var(--adm-text-muted)' }}>
          {selected.note}
        </p>
      )}
    </div>
  );
}
