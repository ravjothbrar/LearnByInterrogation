const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'so', 'because',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'we', 'they',
  'he', 'she', 'him', 'her', 'them', 'his', 'their', 'my', 'your', 'our',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as', 'into',
  'not', 'no', 'do', 'does', 'did', 'has', 'have', 'had', 'can', 'could',
  'will', 'would', 'should', 'may', 'might', 'must', 'shall',
  'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom',
  'there', 'here', 'than', 'also', 'just', 'very', 'more', 'most', 'some',
  'all', 'any', 'each', 'other', 'such', 'only', 'own', 'same', 'too',
  'up', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
  'yes', 'because', 'basically', 'actually', 'really', 'think', 'thing',
  'things', 'like', 'get', 'gets', 'got', 'one', 'two', 'from',
]);

/** Extract candidate "concept" phrases from a note's raw text using cheap heuristics:
 * Title-Case phrases, **bold** markdown spans, and frequent non-stopword n-grams.
 * No LLM call — purely local. */
export function extractConceptCandidates(text: string): string[] {
  const candidates = new Set<string>();

  const boldMatches = text.matchAll(/\*\*([^*]{2,40})\*\*/g);
  for (const m of boldMatches) candidates.add(normalizeLabel(m[1]));

  const titleCaseMatches = text.matchAll(/\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,3})\b/g);
  for (const m of titleCaseMatches) {
    const phrase = m[1].trim();
    if (phrase.split(/\s+/).some((w) => !STOPWORDS.has(w.toLowerCase()))) {
      candidates.add(normalizeLabel(phrase));
    }
  }

  const defPatterns = [
    /([a-zA-Z][a-zA-Z0-9 ]{1,30}?)\s+(?:is|are|means|refers to|is defined as)\s/gi,
  ];
  for (const pattern of defPatterns) {
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      const phrase = m[1].trim();
      if (phrase.length > 2 && phrase.split(/\s+/).length <= 4) {
        candidates.add(normalizeLabel(phrase));
      }
    }
  }

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (!STOPWORDS.has(words[i]) && !STOPWORDS.has(words[i + 1])) {
      candidates.add(normalizeLabel(bigram));
    }
  }

  return Array.from(candidates).filter((c) => c.length >= 3 && c.length <= 42);
}

export function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function conceptKey(label: string): string {
  return label.toLowerCase().trim();
}
