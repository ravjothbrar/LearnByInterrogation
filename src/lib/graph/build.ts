import type { Note, ConceptInfo, GapInfo, BuiltGraph } from '../types';
import { extractConceptCandidates, conceptKey, normalizeLabel } from './concepts';
import { cosineSimilarity } from '../embeddings/client';

const NOTE_SIMILARITY_THRESHOLD = 0.6;
const WEAK_LINK_THRESHOLD = 0.62;
const MAX_CONCEPTS = 60;

interface RawConcept {
  key: string;
  label: string;
  noteIds: string[];
  firstSeen: number;
  strongSignal: boolean;
}

function looksDefined(text: string, label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}\\s+(is|are|means|refers to|is defined as)\\b`, 'i');
  return pattern.test(text);
}

export function buildGraph(notes: Note[]): BuiltGraph {
  const rawConcepts = new Map<string, RawConcept>();

  for (const note of notes) {
    const candidates = extractConceptCandidates(note.text);
    for (const raw of candidates) {
      const key = conceptKey(raw);
      const strongSignal = /\*\*/.test(note.text) && note.text.toLowerCase().includes(raw.toLowerCase())
        ? new RegExp(`\\*\\*\\s*${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*\\*`, 'i').test(note.text)
        : /^[A-Z]/.test(raw);
      const existing = rawConcepts.get(key);
      if (existing) {
        if (!existing.noteIds.includes(note.id)) existing.noteIds.push(note.id);
        existing.strongSignal = existing.strongSignal || strongSignal;
      } else {
        rawConcepts.set(key, {
          key,
          label: normalizeLabel(raw),
          noteIds: [note.id],
          firstSeen: note.createdAt,
          strongSignal,
        });
      }
    }
  }

  const promoted = Array.from(rawConcepts.values())
    .filter((c) => c.strongSignal || c.noteIds.length >= 3)
    .sort((a, b) => b.noteIds.length - a.noteIds.length || a.firstSeen - b.firstSeen)
    .slice(0, MAX_CONCEPTS);

  const concepts: ConceptInfo[] = promoted.map((c) => ({
    id: `concept:${c.key}`,
    label: c.label,
    noteIds: c.noteIds,
    firstSeen: c.firstSeen,
  }));

  const noteConceptEdges = concepts.flatMap((c) =>
    c.noteIds.map((noteId) => ({ noteId, conceptId: c.id })),
  );

  const conceptConceptEdges: { a: string; b: string; weight: number }[] = [];
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const shared = concepts[i].noteIds.filter((id) => concepts[j].noteIds.includes(id));
      if (shared.length > 0) {
        conceptConceptEdges.push({ a: concepts[i].id, b: concepts[j].id, weight: shared.length });
      }
    }
  }

  const noteNoteEdges: { a: string; b: string; weight: number }[] = [];
  const embedded = notes.filter((n) => n.embedding);
  for (let i = 0; i < embedded.length; i++) {
    for (let j = i + 1; j < embedded.length; j++) {
      const sim = cosineSimilarity(embedded[i].embedding!, embedded[j].embedding!);
      if (sim >= NOTE_SIMILARITY_THRESHOLD) {
        noteNoteEdges.push({ a: embedded[i].id, b: embedded[j].id, weight: sim });
      }
    }
  }

  const conceptDegree = new Map<string, number>();
  for (const e of conceptConceptEdges) {
    conceptDegree.set(e.a, (conceptDegree.get(e.a) ?? 0) + 1);
    conceptDegree.set(e.b, (conceptDegree.get(e.b) ?? 0) + 1);
  }

  const conceptEmbedding = new Map<string, number[]>();
  for (const c of concepts) {
    const vectors = c.noteIds
      .map((id) => notes.find((n) => n.id === id)?.embedding)
      .filter((v): v is number[] => !!v);
    if (vectors.length === 0) continue;
    const dim = vectors[0].length;
    const avg = new Array(dim).fill(0);
    for (const v of vectors) for (let k = 0; k < dim; k++) avg[k] += v[k] / vectors.length;
    conceptEmbedding.set(c.id, avg);
  }

  const gaps: GapInfo[] = [];

  for (const c of concepts) {
    const degree = conceptDegree.get(c.id) ?? 0;
    if (c.noteIds.length === 1) {
      const note = notes.find((n) => n.id === c.noteIds[0]);
      if (note && !looksDefined(note.text, c.label)) {
        gaps.push({
          id: `gap:undefined:${c.id}`,
          kind: 'undefined',
          label: c.label,
          detail: `"${c.label}" is mentioned but never explained or defined in your notes.`,
          relatedConceptIds: [c.id],
          relatedNoteIds: c.noteIds,
        });
        continue;
      }
    }
    if (degree === 0 && c.noteIds.length <= 1) {
      gaps.push({
        id: `gap:isolated:${c.id}`,
        kind: 'isolated',
        label: c.label,
        detail: `"${c.label}" is disconnected from the rest of your knowledge — it doesn't relate to anything else you've written.`,
        relatedConceptIds: [c.id],
        relatedNoteIds: c.noteIds,
      });
    }
  }

  const coOccurring = new Set(conceptConceptEdges.map((e) => `${e.a}|${e.b}`));
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const a = concepts[i];
      const b = concepts[j];
      if (coOccurring.has(`${a.id}|${b.id}`)) continue;
      const ea = conceptEmbedding.get(a.id);
      const eb = conceptEmbedding.get(b.id);
      if (!ea || !eb) continue;
      const sim = cosineSimilarity(ea, eb);
      if (sim >= WEAK_LINK_THRESHOLD) {
        gaps.push({
          id: `gap:weak-link:${a.id}:${b.id}`,
          kind: 'weak-link',
          label: `${a.label} ↔ ${b.label}`,
          detail: `"${a.label}" and "${b.label}" seem conceptually related, but you've never connected them in your notes.`,
          relatedConceptIds: [a.id, b.id],
          relatedNoteIds: [],
        });
      }
    }
  }

  return {
    notes,
    concepts,
    gaps: gaps.slice(0, 40),
    noteConceptEdges,
    conceptConceptEdges,
    noteNoteEdges,
  };
}
