import { Handle, Position } from 'reactflow';
import type { NoteTag } from '../../lib/types';

const TAG_COLOR: Record<NoteTag, string> = {
  concept: 'var(--accent-2)',
  definition: 'var(--teal)',
  question: 'var(--amber)',
  insight: 'var(--rose)',
  formula: 'var(--accent-2)',
};

export interface NoteNodeData {
  text: string;
  tag: NoteTag;
  onClick: () => void;
  selected: boolean;
}

export function NoteNode({ data }: { data: NoteNodeData }) {
  const color = TAG_COLOR[data.tag];
  return (
    <div
      onClick={data.onClick}
      style={{ borderColor: data.selected ? color : 'var(--border)' }}
      className="w-[190px] rounded-lg border bg-[var(--bg-raised)] shadow-md cursor-pointer hover:border-[var(--accent-border)] transition-colors"
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{ color }}
        className="font-mono-tag text-[9px] uppercase tracking-wider px-2.5 pt-2 pb-1"
      >
        #{data.tag}
      </div>
      <div className="px-2.5 pb-2.5 text-[11px] leading-snug text-[var(--text)] line-clamp-4">
        {data.text}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export interface ConceptNodeData {
  label: string;
  noteCount: number;
  onClick: () => void;
  selected: boolean;
}

export function ConceptNode({ data }: { data: ConceptNodeData }) {
  return (
    <div
      onClick={data.onClick}
      className="rounded-full border px-4 py-2 shadow-lg cursor-pointer transition-all"
      style={{
        borderColor: data.selected ? 'var(--accent-2)' : 'var(--accent-border)',
        background: 'var(--accent-bg)',
        boxShadow: data.selected ? '0 0 0 2px var(--accent-2)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="text-[12px] font-medium text-[var(--text-h)] whitespace-nowrap">
        {data.label}
      </div>
      <div className="font-mono-tag text-[9px] text-[var(--accent-2)] text-center">
        {data.noteCount} note{data.noteCount === 1 ? '' : 's'}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export interface GapNodeData {
  label: string;
  kind: string;
  onClick: () => void;
  selected: boolean;
}

export function GapNode({ data }: { data: GapNodeData }) {
  return (
    <div
      onClick={data.onClick}
      className="rounded-lg border border-dashed px-3 py-2 shadow-lg cursor-pointer transition-all max-w-[170px]"
      style={{
        borderColor: 'var(--amber-border)',
        background: 'var(--amber-bg)',
        boxShadow: data.selected ? '0 0 0 2px var(--amber)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="font-mono-tag text-[9px] uppercase tracking-wide text-[var(--amber)] mb-0.5">
        ⚠ gap · {data.kind}
      </div>
      <div className="text-[11px] text-[var(--text-h)] leading-snug">{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
