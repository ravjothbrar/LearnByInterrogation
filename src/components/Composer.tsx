import { useState } from 'react';
import type { NoteTag } from '../lib/types';

interface ComposerProps {
  onCommit: (text: string, tag: NoteTag) => void;
  embeddingStatus: 'idle' | 'loading' | 'ready' | 'error';
}

const TAGS: { tag: NoteTag; label: string; color: string }[] = [
  { tag: 'concept', label: '#concept', color: 'var(--accent-2)' },
  { tag: 'definition', label: '#definition', color: 'var(--teal)' },
  { tag: 'question', label: '#question', color: 'var(--amber)' },
  { tag: 'insight', label: '#insight', color: 'var(--rose)' },
  { tag: 'formula', label: '#formula', color: 'var(--accent-2)' },
];

export function Composer({ onCommit, embeddingStatus }: ComposerProps) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState<NoteTag>('concept');

  function commit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCommit(trimmed, tag);
    setText('');
  }

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-panel)] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-soft)]">
        <span className="font-mono-tag text-xs text-[var(--text-dim)] uppercase tracking-wide flex items-center gap-1.5">
          <span className="text-[var(--accent-2)]">◆</span> Write down a learning
        </span>
        <span className="font-mono-tag text-[10px] text-[var(--text-dim)]">
          {embeddingStatus === 'loading' && <span className="text-[var(--amber)]">loading model…</span>}
          {embeddingStatus === 'ready' && (
            <span className="flex items-center gap-1 text-[var(--teal)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] pulse-dot" /> ready
            </span>
          )}
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="A formula, a definition, a claim, a half-formed idea — write it like a brain dump. Cmd/Ctrl+Enter to commit."
        rows={3}
        className="w-full resize-none bg-transparent px-4 py-3 text-sm text-[var(--text-h)] placeholder:text-[var(--text-dim)] outline-none"
      />

      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex gap-1.5 flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t.tag}
              onClick={() => setTag(t.tag)}
              style={
                tag === t.tag
                  ? { color: t.color, borderColor: t.color, background: 'color-mix(in srgb, ' + t.color + ' 14%, transparent)' }
                  : undefined
              }
              className={`font-mono-tag text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                tag === t.tag ? '' : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-h)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={commit}
          disabled={!text.trim()}
          className="font-mono-tag text-xs px-4 py-1.5 rounded-full bg-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed text-white hover:bg-[var(--accent-2)] transition-colors flex items-center gap-1"
        >
          + Commit
        </button>
      </div>
    </div>
  );
}
