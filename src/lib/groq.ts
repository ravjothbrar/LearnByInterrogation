import Groq from 'groq-sdk';
import type { Note, ChatMessage, GapInfo, ConceptInfo } from './types';
import { embeddingClient, cosineSimilarity } from './embeddings/client';

export const GROQ_MODELS = [{ id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' }];

export const DEFAULT_GROQ_MODEL = GROQ_MODELS[0].id;

export interface InterrogationFocus {
  kind: 'gap' | 'concept' | 'note' | 'general';
  label: string;
  gap?: GapInfo;
  concept?: ConceptInfo;
  note?: Note;
}

async function retrieveRelevantNotes(notes: Note[], query: string, topK = 6): Promise<Note[]> {
  const embedded = notes.filter((n) => n.embedding);
  if (embedded.length === 0) return notes.slice(-topK);
  try {
    const queryEmbedding = await embeddingClient.embed(query);
    return embedded
      .map((n) => ({ note: n, score: cosineSimilarity(queryEmbedding, n.embedding!) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.note);
  } catch {
    return notes.slice(-topK);
  }
}

function buildSystemPrompt(focus: InterrogationFocus, context: Note[], isOpening: boolean): string {
  const contextBlock = context
    .map((n, i) => `[${i + 1}] (#${n.tag}) ${n.text}`)
    .join('\n');

  let focusInstruction = '';
  if (focus.kind === 'gap' && focus.gap) {
    if (focus.gap.kind === 'undefined') {
      focusInstruction = `The learner mentioned "${focus.gap.label}" but never defined or explained it. Press them to articulate what it actually means, in their own words, before moving on.`;
    } else if (focus.gap.kind === 'isolated') {
      focusInstruction = `The concept "${focus.gap.label}" is disconnected from everything else the learner knows. Push them to explain how it relates to their other notes — or admit they don't yet know.`;
    } else {
      focusInstruction = `The learner has two ideas — "${focus.gap.label}" — that seem related but they've never connected them explicitly. Probe whether they actually see the connection.`;
    }
  } else if (focus.kind === 'concept' && focus.concept) {
    focusInstruction = `Interrogate the learner's understanding of "${focus.concept.label}" specifically. Test edge cases, ask for definitions, ask them to justify claims.`;
  } else if (focus.kind === 'note' && focus.note) {
    focusInstruction = `Interrogate this specific claim/note closely: "${focus.note.text}". Question its assumptions.`;
  } else {
    focusInstruction = `Scan the learner's notes as a whole. Pick the weakest, vaguest, or most under-examined idea and interrogate it first.`;
  }

  const openingInstruction = `The learner just wrote this note and has not said anything yet. Do not greet them or wait — open immediately with 1-2 sharp Socratic questions about it, using the related notes below for context (point out a connection, a contradiction, or an undefined term if one jumps out). Get straight into it.`;

  return `You are Socrates, conducting a rigorous Socratic interrogation of a learner's own written notes to reinforce and deepen their understanding. You are not a lecturer — you almost never explain things directly. Instead you ask short, sharp, probing questions, one or two at a time, that force the learner to articulate, defend, or revise their own beliefs.

Rules:
- Never just tell the learner the answer. Ask questions that lead them there.
- Reference their own notes directly ("You wrote that X is Y — but what about Z?").
- If they contradict an earlier note, point it out and ask them to reconcile it.
- If an answer is vague, ask them to be precise. If it's confident but wrong, ask a question that exposes the flaw rather than correcting them outright.
- Keep replies short: 2-5 sentences, mostly a question or two. No long essays.
- Occasionally, when they've reasoned well, acknowledge it briefly before pushing further.
- Stay warm but relentless — like a mentor who respects them enough to not let them off easy.

${focusInstruction}
${isOpening ? `\n${openingInstruction}\n` : ''}
Here are relevant excerpts from the learner's notes (their own words, retrieved by relevance):
${contextBlock || '(no notes yet — ask them to start writing down what they know)'}
`;
}

export async function interrogate(params: {
  apiKey: string;
  model: string;
  allNotes: Note[];
  history: ChatMessage[];
  userMessage: string;
  focus: InterrogationFocus;
  onToken?: (partial: string) => void;
}): Promise<string> {
  const { apiKey, model, allNotes, history, userMessage, focus, onToken } = params;
  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

  const isOpening = !userMessage.trim();
  const queryText = userMessage.trim() || focus.note?.text || focus.concept?.label || focus.gap?.label || focus.label;
  const context = await retrieveRelevantNotes(
    allNotes.filter((n) => n.id !== focus.note?.id),
    queryText,
  );
  const systemPrompt = buildSystemPrompt(focus, context, isOpening);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    })),
  ];
  if (userMessage.trim()) {
    messages.push({ role: 'user', content: userMessage });
  }

  if (onToken) {
    const stream = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });
    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        onToken(full);
      }
    }
    return full;
  }

  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });
  return completion.choices[0]?.message?.content ?? '';
}
