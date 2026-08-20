import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import type { BuiltGraph } from '../lib/types';
import { NoteNode, ConceptNode, GapNode } from './nodes/GraphNodes';
import type { InterrogationFocus } from '../lib/groq';

const nodeTypes = {
  note: NoteNode,
  concept: ConceptNode,
  gap: GapNode,
};

interface GraphViewProps {
  graph: BuiltGraph;
  focus: InterrogationFocus | null;
  onSelect: (focus: InterrogationFocus) => void;
}

export function GraphView({ graph, focus, onSelect }: GraphViewProps) {
  const { nodes, edges } = useMemo(() => buildLayout(graph, focus, onSelect), [graph, focus, onSelect]);

  if (graph.notes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <p className="text-[var(--text-dim)] text-sm max-w-xs">
          Your knowledge graph is empty. Write your first learning below and Socrates will
          start mapping it.
        </p>
      </div>
    );
  }

  return (
    <ReactFlow
      key={`${graph.notes.length}-${graph.concepts.length}-${graph.gaps.length}`}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
    >
      <Background color="var(--border-soft)" gap={28} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        maskColor="rgba(10,10,15,0.8)"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
        nodeColor={(n) => (n.type === 'gap' ? '#d4a24c' : n.type === 'concept' ? '#8b5cf6' : '#3a3a45')}
      />
    </ReactFlow>
  );
}

function buildLayout(
  graph: BuiltGraph,
  focus: InterrogationFocus | null,
  onSelect: (f: InterrogationFocus) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const conceptPos = new Map<string, { x: number; y: number }>();

  const conceptRadius = Math.max(220, graph.concepts.length * 26);
  graph.concepts.forEach((c, i) => {
    const angle = (2 * Math.PI * i) / Math.max(graph.concepts.length, 1);
    const pos = { x: Math.cos(angle) * conceptRadius, y: Math.sin(angle) * conceptRadius };
    conceptPos.set(c.id, pos);
    const selected = focus?.kind === 'concept' && focus.concept?.id === c.id;
    nodes.push({
      id: c.id,
      type: 'concept',
      position: pos,
      data: {
        label: c.label,
        noteCount: c.noteIds.length,
        selected,
        onClick: () => onSelect({ kind: 'concept', label: c.label, concept: c }),
      },
    });
  });

  const noteAngleAccum = new Map<string, number[]>();
  for (const e of graph.noteConceptEdges) {
    const pos = conceptPos.get(e.conceptId);
    if (!pos) continue;
    const angle = Math.atan2(pos.y, pos.x);
    const arr = noteAngleAccum.get(e.noteId) ?? [];
    arr.push(angle);
    noteAngleAccum.set(e.noteId, arr);
  }

  let unlinkedIndex = 0;
  graph.notes.forEach((note) => {
    const angles = noteAngleAccum.get(note.id);
    let pos: { x: number; y: number };
    if (angles && angles.length > 0) {
      const avgAngle = Math.atan2(
        angles.reduce((s, a) => s + Math.sin(a), 0),
        angles.reduce((s, a) => s + Math.cos(a), 0),
      );
      const jitter = (hashStr(note.id) % 60) - 30;
      const r = conceptRadius + 150 + jitter;
      pos = { x: Math.cos(avgAngle) * r, y: Math.sin(avgAngle) * r };
    } else {
      const angle = (2 * Math.PI * unlinkedIndex) / 8;
      const r = 70 + Math.floor(unlinkedIndex / 8) * 60;
      pos = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
      unlinkedIndex++;
    }
    const selected = focus?.kind === 'note' && focus.note?.id === note.id;
    nodes.push({
      id: `note:${note.id}`,
      type: 'note',
      position: pos,
      data: {
        text: note.text,
        tag: note.tag,
        selected,
        onClick: () => onSelect({ kind: 'note', label: note.text.slice(0, 40), note }),
      },
    });
  });

  for (const e of graph.noteConceptEdges) {
    edges.push({
      id: `nc:${e.noteId}:${e.conceptId}`,
      source: `note:${e.noteId}`,
      target: e.conceptId,
      style: { stroke: 'var(--border)', strokeWidth: 1 },
      type: 'straight',
    });
  }

  for (const e of graph.conceptConceptEdges) {
    edges.push({
      id: `cc:${e.a}:${e.b}`,
      source: e.a,
      target: e.b,
      style: { stroke: 'var(--accent-border)', strokeWidth: Math.min(1 + e.weight * 0.6, 4) },
      type: 'straight',
    });
  }

  const gapRadius = conceptRadius + 320;
  graph.gaps.forEach((g, i) => {
    const angle = (2 * Math.PI * i) / Math.max(graph.gaps.length, 1) + 0.3;
    const pos = { x: Math.cos(angle) * gapRadius, y: Math.sin(angle) * gapRadius };
    const selected = focus?.kind === 'gap' && focus.gap?.id === g.id;
    nodes.push({
      id: g.id,
      type: 'gap',
      position: pos,
      data: {
        label: g.label,
        kind: g.kind,
        selected,
        onClick: () => onSelect({ kind: 'gap', label: g.label, gap: g }),
      },
    });
    for (const conceptId of g.relatedConceptIds) {
      if (!conceptPos.has(conceptId)) continue;
      edges.push({
        id: `gap:${g.id}:${conceptId}`,
        source: g.id,
        target: conceptId,
        style: { stroke: 'var(--amber-border)', strokeWidth: 1.5, strokeDasharray: '4 3' },
        type: 'straight',
      });
    }
  });

  return { nodes, edges };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
