import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;

type Req =
  | { id: number; type: 'embed'; text: string }
  | { id: number; type: 'embedBatch'; texts: string[] };

type Res =
  | { id: number; type: 'ready' }
  | { id: number; type: 'embed'; embedding: number[] }
  | { id: number; type: 'embedBatch'; embeddings: number[][] }
  | { id: number; type: 'error'; message: string }
  | { id: -1; type: 'progress'; status: string };

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (p: unknown) => {
        const status = typeof p === 'object' && p && 'status' in p ? String((p as { status: unknown }).status) : 'loading';
        (self as unknown as { postMessage: (m: Res) => void }).postMessage({ id: -1, type: 'progress', status });
      },
    }) as unknown as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

async function embedOne(extractor: FeatureExtractionPipeline, text: string): Promise<number[]> {
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const msg = ev.data;
  try {
    const extractor = await getExtractor();
    if (msg.type === 'embed') {
      const embedding = await embedOne(extractor, msg.text);
      const res: Res = { id: msg.id, type: 'embed', embedding };
      (self as unknown as { postMessage: (m: Res) => void }).postMessage(res);
    } else if (msg.type === 'embedBatch') {
      const embeddings: number[][] = [];
      for (const t of msg.texts) {
        embeddings.push(await embedOne(extractor, t));
      }
      const res: Res = { id: msg.id, type: 'embedBatch', embeddings };
      (self as unknown as { postMessage: (m: Res) => void }).postMessage(res);
    }
  } catch (err) {
    const res: Res = { id: msg.id, type: 'error', message: err instanceof Error ? err.message : String(err) };
    (self as unknown as { postMessage: (m: Res) => void }).postMessage(res);
  }
};
