import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopNav } from './components/TopNav';
import { WhyModal } from './components/WhyModal';
import { SettingsModal } from './components/SettingsModal';
import { Composer } from './components/Composer';
import { GraphView } from './components/GraphView';
import { InterrogationPanel } from './components/InterrogationPanel';
import {
  getAllNotes,
  saveNote,
  getSettings,
  saveSettings,
  getAllChat,
  addChatMessage,
  clearAllNotes,
  clearChat,
} from './lib/db';
import { embeddingClient, type EmbeddingStatus } from './lib/embeddings/client';
import { buildGraph } from './lib/graph/build';
import { interrogate, DEFAULT_GROQ_MODEL, type InterrogationFocus } from './lib/groq';
import type { Note, NoteTag, Settings, ChatMessage } from './lib/types';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<Settings>({ groqApiKey: '', groqModel: DEFAULT_GROQ_MODEL });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showWhy, setShowWhy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus>('idle');
  const [focus, setFocus] = useState<InterrogationFocus | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedNotes, storedSettings, storedChat] = await Promise.all([
        getAllNotes(),
        getSettings(),
        getAllChat(),
      ]);
      setNotes(storedNotes);
      setSettings(storedSettings);
      setMessages(storedChat);
    })();
    return embeddingClient.onStatus(setEmbeddingStatus);
  }, []);

  const graph = useMemo(() => buildGraph(notes), [notes]);

  const runInterrogation = useCallback(
    async (params: {
      apiKey: string;
      model: string;
      allNotes: Note[];
      history: ChatMessage[];
      userMessage: string;
      focus: InterrogationFocus;
    }) => {
      setIsStreaming(true);
      const assistantId = uid();
      try {
        const finalText = await interrogate({
          ...params,
          onToken: (partial) => {
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === assistantId);
              const assistantMsg: ChatMessage = {
                id: assistantId,
                role: 'assistant',
                content: partial,
                createdAt: Date.now(),
              };
              if (existing) {
                return prev.map((m) => (m.id === assistantId ? assistantMsg : m));
              }
              return [...prev, assistantMsg];
            });
          },
        });
        const finalMsg: ChatMessage = { id: assistantId, role: 'assistant', content: finalText, createdAt: Date.now() };
        await addChatMessage(finalMsg);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: `⚠ Something went wrong talking to Groq: ${err instanceof Error ? err.message : String(err)}`,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev.filter((m) => m.id !== assistantId), errorMsg]);
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const commitNote = useCallback(
    async (text: string, tag: NoteTag) => {
      const note: Note = { id: uid(), text, tag, createdAt: Date.now(), embedding: null };
      const notesWithNew = [...notes, note];
      setNotes(notesWithNew);
      await saveNote(note);

      const noteFocus: InterrogationFocus = { kind: 'note', label: text.slice(0, 40), note };
      setFocus(noteFocus);
      if (settings.groqApiKey) {
        runInterrogation({
          apiKey: settings.groqApiKey,
          model: settings.groqModel,
          allNotes: notesWithNew,
          history: [],
          userMessage: '',
          focus: noteFocus,
        });
      }

      try {
        const embedding = await embeddingClient.embed(text);
        const withEmbedding: Note = { ...note, embedding };
        setNotes((prev) => prev.map((n) => (n.id === note.id ? withEmbedding : n)));
        await saveNote(withEmbedding);
      } catch (err) {
        console.error('embedding failed', err);
      }
    },
    [notes, settings, runInterrogation],
  );

  const saveSettingsHandler = useCallback(async (s: Settings) => {
    setSettings(s);
    await saveSettings(s);
  }, []);

  const clearAllData = useCallback(async () => {
    await clearAllNotes();
    await clearChat();
    setNotes([]);
    setMessages([]);
    setFocus(null);
    setShowSettings(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!settings.groqApiKey) {
        setShowSettings(true);
        return;
      }
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        focusNodeId: focus?.label,
      };
      const historyBefore = messages;
      setMessages((prev) => [...prev, userMsg]);
      await addChatMessage(userMsg);

      await runInterrogation({
        apiKey: settings.groqApiKey,
        model: settings.groqModel,
        allNotes: notes,
        history: historyBefore,
        userMessage: text,
        focus: focus ?? { kind: 'general', label: 'general' },
      });
    },
    [settings, notes, messages, focus, runInterrogation],
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopNav
        onWhy={() => setShowWhy(true)}
        onSettings={() => setShowSettings(true)}
        noteCount={notes.length}
        gapCount={graph.gaps.length}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <GraphView graph={graph} focus={focus} onSelect={setFocus} />
            <a
              href="https://ravjothbrar.com/"
              target="_blank"
              rel="noreferrer"
              className="absolute top-3 right-4 z-10 font-mono-tag text-[10px] text-[var(--text-dim)] hover:text-[var(--accent-2)] transition-colors"
            >
              Built by Ravjoth Brar ↗
            </a>
          </div>
          <div className="p-4 shrink-0 border-t border-[var(--border)]">
            <Composer onCommit={commitNote} embeddingStatus={embeddingStatus} />
          </div>
        </div>

        <div className="w-[380px] shrink-0">
          <InterrogationPanel
            graph={graph}
            focus={focus}
            onFocus={setFocus}
            messages={messages}
            onSend={sendMessage}
            isStreaming={isStreaming}
            hasApiKey={!!settings.groqApiKey}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>
      </div>

      {showWhy && <WhyModal onClose={() => setShowWhy(false)} />}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettingsHandler}
          onClose={() => setShowSettings(false)}
          onClearData={clearAllData}
        />
      )}
    </div>
  );
}
