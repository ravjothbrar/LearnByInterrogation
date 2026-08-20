interface TopNavProps {
  onWhy: () => void;
  onSettings: () => void;
  noteCount: number;
  gapCount: number;
}

export function TopNav({ onWhy, onSettings, noteCount, gapCount }: TopNavProps) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onWhy}
          className="font-mono-tag text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-h)] hover:border-[var(--accent-border)] transition-colors"
        >
          Why?
        </button>
        <a
          href="https://ravjothbrar.com/"
          target="_blank"
          rel="noreferrer"
          className="font-mono-tag text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-h)] hover:border-[var(--accent-border)] transition-colors"
        >
          Created by Ravjoth Brar
        </a>
      </div>

      <h1 className="text-lg font-semibold tracking-tight text-[var(--text-h)] absolute left-1/2 -translate-x-1/2">
        <span className="text-[var(--accent-2)]">Learn</span>ByInterrogation
      </h1>

      <div className="flex items-center gap-3">
        <span className="font-mono-tag text-xs text-[var(--text-dim)]">
          {noteCount}n {gapCount > 0 && <span className="text-[var(--amber)]">· {gapCount} gaps</span>}
        </span>
        <button
          onClick={onSettings}
          className="font-mono-tag text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-h)] hover:border-[var(--accent-border)] transition-colors flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </header>
  );
}
