import { useState } from 'react';
import type { Settings } from '../lib/types';
import { GROQ_MODELS, DEFAULT_GROQ_MODEL } from '../lib/groq';

interface SettingsModalProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
  onClearData: () => void;
}

export function SettingsModal({ settings, onSave, onClose, onClearData }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(settings.groqApiKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-8 shadow-2xl animate-fade-in-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <span className="font-mono-tag text-xs text-[var(--accent-2)] uppercase tracking-widest">
            ⚙ Settings
          </span>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text-h)] text-lg leading-none">
            ×
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-inset)] p-4 text-sm text-[var(--text-dim)] leading-relaxed">
          <p className="text-[var(--text-h)] font-medium mb-2">Bring your own Groq API key</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Go to{' '}
              <a
                className="text-[var(--accent-2)] underline"
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
              >
                console.groq.com/keys
              </a>{' '}
              and sign in (free).
            </li>
            <li>Click "Create API Key" and copy it.</li>
            <li>Paste it below — it's stored only in your browser's local database, never sent anywhere but Groq.</li>
          </ol>
        </div>

        <label className="block mb-4">
          <span className="font-mono-tag text-xs text-[var(--text-dim)] uppercase tracking-wide">Groq API Key</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-2 text-sm text-[var(--text-h)] font-mono-tag outline-none focus:border-[var(--accent-border)]"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--text-h)] px-2"
            >
              {showKey ? 'hide' : 'show'}
            </button>
          </div>
        </label>

        <div className="block mb-6">
          <span className="font-mono-tag text-xs text-[var(--text-dim)] uppercase tracking-wide">Model</span>
          <div className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-2 text-sm text-[var(--text-h)] flex items-center justify-between">
            <span>{GROQ_MODELS[0].label}</span>
            <span className="font-mono-tag text-[10px] text-[var(--text-dim)]">via Groq</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              onSave({ groqApiKey: apiKey.trim(), groqModel: DEFAULT_GROQ_MODEL });
              onClose();
            }}
            className="flex-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white font-medium py-2.5 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              if (confirm('Delete all notes and chat history stored in this browser? This cannot be undone.')) {
                onClearData();
              }
            }}
            className="rounded-lg border border-[var(--rose-border)] text-[var(--rose)] px-4 py-2.5 text-sm hover:bg-[var(--rose-bg)] transition-colors"
          >
            Clear local data
          </button>
        </div>
      </div>
    </div>
  );
}
