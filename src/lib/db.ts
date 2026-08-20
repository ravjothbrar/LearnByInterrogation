import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Note, Settings, ChatMessage } from './types';
import { DEFAULT_GROQ_MODEL } from './groq';

interface LBIDb extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-createdAt': number };
  };
  settings: {
    key: string;
    value: Settings;
  };
  chat: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'learn-by-interrogation';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LBIDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LBIDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const notes = db.createObjectStore('notes', { keyPath: 'id' });
        notes.createIndex('by-createdAt', 'createdAt');
        db.createObjectStore('settings', { keyPath: 'id' } as never);
        const chat = db.createObjectStore('chat', { keyPath: 'id' });
        chat.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function saveNote(note: Note): Promise<void> {
  const db = await getDb();
  await db.put('notes', note);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('notes', id);
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('notes', 'by-createdAt');
  return all;
}

export async function clearAllNotes(): Promise<void> {
  const db = await getDb();
  await db.clear('notes');
}

const SETTINGS_KEY = 'app-settings';

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const raw = await db.get('settings', SETTINGS_KEY as never);
  if (raw) return { ...(raw as Settings), groqModel: DEFAULT_GROQ_MODEL };
  return { groqApiKey: '', groqModel: DEFAULT_GROQ_MODEL };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDb();
  await db.put('settings', { ...settings, id: SETTINGS_KEY } as never);
}

export async function getAllChat(): Promise<ChatMessage[]> {
  const db = await getDb();
  return db.getAllFromIndex('chat', 'by-createdAt');
}

export async function addChatMessage(msg: ChatMessage): Promise<void> {
  const db = await getDb();
  await db.put('chat', msg);
}

export async function clearChat(): Promise<void> {
  const db = await getDb();
  await db.clear('chat');
}
