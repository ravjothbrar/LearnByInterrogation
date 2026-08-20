export type NoteTag = 'concept' | 'definition' | 'question' | 'insight' | 'formula';

export interface Note {
  id: string;
  text: string;
  tag: NoteTag;
  createdAt: number;
  embedding: number[] | null;
}

export type GraphNodeKind = 'note' | 'concept' | 'gap';

export interface ConceptInfo {
  id: string;
  label: string;
  noteIds: string[];
  firstSeen: number;
}

export type GapKind = 'undefined' | 'isolated' | 'weak-link';

export interface GapInfo {
  id: string;
  kind: GapKind;
  label: string;
  detail: string;
  relatedConceptIds: string[];
  relatedNoteIds: string[];
}

export interface BuiltGraph {
  notes: Note[];
  concepts: ConceptInfo[];
  gaps: GapInfo[];
  noteConceptEdges: { noteId: string; conceptId: string }[];
  conceptConceptEdges: { a: string; b: string; weight: number }[];
  noteNoteEdges: { a: string; b: string; weight: number }[];
}

export interface Settings {
  groqApiKey: string;
  groqModel: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  focusNodeId?: string;
}
