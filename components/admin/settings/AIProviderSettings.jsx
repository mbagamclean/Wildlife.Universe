'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/lib/stores/aiStore';

const PROVIDERS = [
  {
    id: 'claude', label: 'Claude (Anthropic)', icon: '🧠',
    color: '#d97706', defaultModel: 'claude-opus-4-7',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    description: 'Primary AI for long-form wildlife articles, EEAT optimization, and nuanced storytelling.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai', label: 'OpenAI (GPT-4o)', icon: '⚡',
    color: '#059669', defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    description: 'Used for SEO field generation, image generation (DALL·E 3), and secondary writing tasks.',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini', label: 'Google Gemini', icon: '✦',
    color: '#7c3aed', defaultModel: 'gemini-1.5-pro',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    description: 'Powers Imagen 3 for ultra-realistic 8K wildlife photography generation.',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
];

function ProviderCard({ provider, settings, onSave }) {
  const [key, setKey] = useState('');
  const [model, setModel] = useState(settings?.preferredModel || provider.defaultModel);
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [preferred, setPreferred] = useState(settings?.isPreferred ?? false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id, apiKey: key || undefined, enabled, isPreferred: preferred, preferredModel: model }),
      });
      const json = await res.json();
      if (json.success) {
        setKey('');
        onSave?.();
        setTestResult({ success: true, message: 'Settings saved.' });
      } else {
        setTestResult({ success: false, message: json.error });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${enabled ? provider.color + '40' : 'var(--adm-border)'}`,
      background: enabled ? `${provider.color}08` : 'var(--adm-surface)',
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: `${provider.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>
          {provider.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>{provider.label}</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 1 }}>{provider.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {settings?.hasKey && (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: `${provider.color}20`, color: provider.color, fontWeight: 700 }}>
              KEY SET
            </span>
          )}
          <div
            onClick={() => setEnabled(e => !e)}
            style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
              background: enabled ? provider.color : 'var(--adm-border)', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: enabled ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--adm-text-subtle)', fontSize: 12, padding: 4 }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Expanded settings */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--adm-border)' }}>
              <div style={{ paddingTop: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  API Key
                </label>
                <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ float: 'right', fontSize: 10, color: provider.color, fontWeight: 600 }}
                >
                  Get API Key ↗
                </a>
                <div style={{ display: 'flex', gap: 0, marginTop: 5 }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    placeholder={settings?.hasKey ? '••••••••••••••••••••• (already set)' : 'sk-...'}
                    style={{
                      flex: 1, borderRadius: '7px 0 0 7px', border: '1px solid var(--adm-border)',
                      borderRight: 'none', background: 'var(--adm-bg)', color: 'var(--adm-text)',
                      padding: '7px 10px', fontSize: 12, outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setShowKey(s => !s)}
                    style={{
                      padding: '7px 10px', borderRadius: '0 7px 7px 0', border: '1px solid var(--adm-border)',
                      background: 'var(--adm-hover-bg)', color: 'var(--adm-text-subtle)', cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    {showKey ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{
                    width: '100%', borderRadius: 7, border: '1px solid var(--adm-border)',
                    background: 'var(--adm-bg)', color: 'var(--adm-text)', padding: '6px 9px', fontSize: 12, outline: 'none',
                  }}
                >
                  {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={preferred} onChange={e => setPreferred(e.target.checked)} style={{ accentColor: provider.color }} />
                Set as preferred provider
              </label>

              {/* Test result */}
              <AnimatePresence>
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      padding: '8px 11px', borderRadius: 7, fontSize: 11,
                      background: testResult.success ? 'rgba(5,150,105,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${testResult.success ? 'rgba(5,150,105,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      color: testResult.success ? '#059669' : '#dc2626',
                    }}
                  >
                    {testResult.success ? '✓' : '✗'} {testResult.message}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  onClick={testConnection}
                  disabled={testing || !settings?.hasKey}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${provider.color}40`, background: `${provider.color}10`,
                    color: provider.color, cursor: testing ? 'wait' : 'pointer',
                    opacity: !settings?.hasKey ? 0.5 : 1,
                  }}
                >
                  {testing ? '⟳ Testing…' : '⚡ Test Connection'}
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    border: 'none', background: provider.color,
                    color: '#fff', cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AIProviderSettings() {
  const store = useAIStore();
  const [providerData, setProviderData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/settings');
      const json = await res.json();
      if (json.success) setProviderData(json.providers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getSettings = (id) => providerData.find(p => p.provider === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--adm-text)', marginBottom: 4 }}>AI Providers</div>
        <div style={{ fontSize: 13, color: 'var(--adm-text-subtle)' }}>
          Configure your AI provider API keys. Keys are encrypted with AES-256-GCM before storage.
        </div>
      </div>

      {/* Global provider selector */}
      <div style={{ margin: '0 24px', padding: '14px 16px', borderRadius: 12, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Active Provider (Writing)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['claude', 'openai'].map(p => (
            <button
              key={p}
              onClick={() => store.setProvider(p)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1px solid ${store.provider === p ? PROVIDERS.find(pr => pr.id === p)?.color + '60' : 'var(--adm-border)'}`,
                background: store.provider === p ? PROVIDERS.find(pr => pr.id === p)?.color + '15' : 'transparent',
                color: store.provider === p ? PROVIDERS.find(pr => pr.id === p)?.color : 'var(--adm-text-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {PROVIDERS.find(pr => pr.id === p)?.icon} {p === 'claude' ? 'Claude' : 'OpenAI'}
            </button>
          ))}
        </div>
      </div>

      {/* Provider cards */}
      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--adm-text-subtle)', fontSize: 13 }}>
            Loading provider settings…
          </div>
        ) : (
          PROVIDERS.map(p => (
            <ProviderCard
              key={p.id}
              provider={p}
              settings={getSettings(p.id)}
              onSave={load}
            />
          ))
        )}
      </div>

      {/* Security note */}
      <div style={{ margin: '0 24px 24px', padding: '12px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#d4af37', marginBottom: 5 }}>🔐 Security</div>
        <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', lineHeight: 1.6 }}>
          API keys are encrypted with AES-256-GCM using a server-side key before storage. Keys are never sent to the client and only decrypted server-side during API calls. Set <code>AI_ENCRYPTION_KEY</code> in your environment variables for a custom encryption key.
        </div>
      </div>
    </div>
  );
}
