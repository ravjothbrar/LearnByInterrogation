import { useEffect, useRef, useState } from 'react';
import type { BuiltGraph, ChatMessage, Note } from '../lib/types';
import type { InterrogationFocus } from '../lib/groq';

interface InterrogationPanelProps {
  graph: BuiltGraph;
  focus: InterrogationFocus | null;
  onFocus: (f: InterrogationFocus) => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isStreaming: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export function InterrogationPanel({
  graph,
  focus,
  onFocus,
  messages,
  onSend,
  isStreaming,
  hasApiKey,
  onOpenSettings,
}: InterrogationPanelProps) {
  const [tab, setTab] = useState<'interrogate' | 'notes'>('interrogate');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  function send() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full border-l border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="flex items-center border-b border-[var(--border)] shrink-0">
        <TabButton active={tab === 'interrogate'} onClick={() => setTab('interrogate')} icon="⚡">
          Interrogate
        </TabButton>
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')} icon="☰">
          Notes ({graph.notes.length})
        </TabButton>
      </div>

      {tab === 'notes' ? (
        <NotesTab notes={graph.notes} onFocus={onFocus} />
      ) : (
        <>
          <div className="px-4 py-2.5 border-b border-[var(--border-soft)] flex items-center justify-between shrink-0">
            <span className="font-mono-tag text-[11px] text-[var(--text-dim)]">
              focus:{' '}
              <span className="text-[var(--accent-2)]">
                {focus ? focus.label : 'general — whole graph'}
              </span>
            </span>
            {hasApiKey && (
              <span className="flex items-center gap-1 font-mono-tag text-[10px] text-[var(--teal)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] pulse-dot" /> ready
              </span>
            )}
          </div>

          {graph.gaps.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-soft)] flex gap-1.5 flex-wrap shrink-0">
              {graph.gaps.slice(0, 4).map((g) => (
                <button
                  key={g.id}
                  onClick={() => onFocus({ kind: 'gap', label: g.label, gap: g })}
                  className="font-mono-tag text-[10px] px-2 py-1 rounded-full border border-[var(--amber-border)] text-[var(--amber)] bg-[var(--amber-bg)] hover:brightness-125 transition-all"
                >
                  ⚠ {g.label}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {!hasApiKey ? (
              <EmptyStateNoKey onOpenSettings={onOpenSettings} />
            ) : messages.length === 0 ? (
              <EmptyStateReady />
            ) : (
              messages.map((m) => <ChatBubble key={m.id} message={m} />)
            )}
            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <ChatBubble
                message={{ id: 'streaming', role: 'assistant', content: '…', createdAt: 0 }}
              />
            )}
          </div>

          <div className="p-3 border-t border-[var(--border)] shrink-0">
            <div className="flex items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] px-3 py-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={!hasApiKey}
                rows={1}
                placeholder={hasApiKey ? 'Answer Socrates…' : 'Add a Groq API key in Settings to begin'}
                className="flex-1 resize-none bg-transparent text-sm text-[var(--text-h)] placeholder:text-[var(--text-dim)] outline-none max-h-24"
              />
              <button
                onClick={send}
                disabled={!hasApiKey || !input.trim() || isStreaming}
                className="font-mono-tag text-xs px-3 py-1.5 rounded-md bg-[var(--accent)] disabled:opacity-30 text-white hover:bg-[var(--accent-2)] transition-colors shrink-0"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 font-mono-tag text-xs py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
        active
          ? 'border-[var(--accent)] text-[var(--text-h)]'
          : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
      }`}
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[var(--accent)] text-white rounded-br-sm'
            : 'bg-[var(--bg-inset)] border border-[var(--border-soft)] text-[var(--text)] rounded-bl-sm'
        }`}
      >
        {!isUser && <div className="font-mono-tag text-[9px] text-[var(--accent-2)] mb-1 uppercase tracking-wide">Socrates</div>}
        {message.content}
      </div>
    </div>
  );
}

function EmptyStateReady() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
      <div className="text-3xl mb-3 opacity-60">⚡</div>
      <p className="text-sm text-[var(--text-dim)] max-w-[220px]">
        Pick a gap or a concept from the graph, or just say hello — Socrates will find something
        to question.
      </p>
    </div>
  );
}

function EmptyStateNoKey({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
      <div className="text-3xl mb-3 opacity-60">🔑</div>
      <p className="text-sm text-[var(--text-dim)] max-w-[220px] mb-3">
        Connect a free Groq API key to let Socrates interrogate your notes.
      </p>
      <button
        onClick={onOpenSettings}
        className="font-mono-tag text-xs px-3 py-1.5 rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-2)] transition-colors"
      >
        Open Settings
      </button>
    </div>
  );
}

function NotesTab({ notes, onFocus }: { notes: Note[]; onFocus: (f: InterrogationFocus) => void }) {
  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <p className="text-sm text-[var(--text-dim)]">No notes yet. Write your first one below.</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
      {[...notes].reverse().map((n) => (
        <button
          key={n.id}
          onClick={() => onFocus({ kind: 'note', label: n.text.slice(0, 40), note: n })}
          className="text-left rounded-lg border border-[var(--border-soft)] bg-[var(--bg-inset)] px-3 py-2.5 hover:border-[var(--accent-border)] transition-colors"
        >
          <div className="font-mono-tag text-[9px] uppercase tracking-wide text-[var(--accent-2)] mb-1">
            #{n.tag}
          </div>
          <div className="text-[12px] text-[var(--text)] leading-snug line-clamp-3">{n.text}</div>
        </button>
      ))}
    </div>
  );
}
