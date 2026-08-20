export type EmbeddingStatus = 'idle' | 'loading' | 'ready' | 'error';

type Listener = (status: EmbeddingStatus, detail?: string) => void;

class EmbeddingClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: number[] | number[][]) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private status: EmbeddingStatus = 'idle';

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.status = 'loading';
      this.worker.onmessage = (ev: MessageEvent) => {
        const msg = ev.data;
        if (msg.type === 'progress') {
          this.emit('loading', msg.status);
          return;
        }
        if (msg.type === 'error') {
          const p = this.pending.get(msg.id);
          if (p) p.reject(new Error(msg.message));
          this.pending.delete(msg.id);
          this.emit('error', msg.message);
          return;
        }
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.type === 'embed') {
          this.status = 'ready';
          this.emit('ready');
          p.resolve(msg.embedding);
        } else if (msg.type === 'embedBatch') {
          this.status = 'ready';
          this.emit('ready');
          p.resolve(msg.embeddings);
        }
      };
    }
    return this.worker;
  }

  onStatus(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private emit(status: EmbeddingStatus, detail?: string) {
    this.status = status;
    for (const l of this.listeners) l(status, detail);
  }

  async embed(text: string): Promise<number[]> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<number[]>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: number[] | number[][]) => void, reject });
      worker.postMessage({ id, type: 'embed', text });
    });
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<number[][]>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: number[] | number[][]) => void, reject });
      worker.postMessage({ id, type: 'embedBatch', texts });
    });
  }
}

export const embeddingClient = new EmbeddingClient();

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
