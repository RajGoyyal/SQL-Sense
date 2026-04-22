'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { VisualizationData } from '@/lib/types';

interface Props {
  data: VisualizationData;
}

/* ── Custom Schema Node ─────────────────────────────────────── */
function SchemaNode({ data }: NodeProps) {
  const nodeData = data as any;
  return (
    <div className={`schema-node ${nodeData.isFromQuery ? 'query-table' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: 'var(--accent)', width: 8, height: 8 }} />
      <div className="schema-node-header">
        <span>🗂</span>
        {nodeData.label}
      </div>
      <div className="schema-node-body">
        {(nodeData.columns || []).map((col: any, i: number) => (
          <div
            key={i}
            className={`schema-col ${col.isSelected ? 'selected' : ''} ${col.isFiltered ? 'filtered' : ''}`}
          >
            <span className="schema-col-icon">
              {col.isPrimary ? '🔑' : col.isForeign ? '🔗' : '·'}
            </span>
            <span className="schema-col-name">{col.name}</span>
            {col.type && <span className="schema-col-type">{col.type}</span>}
          </div>
        ))}
        {(!nodeData.columns || nodeData.columns.length === 0) && (
          <div className="schema-col" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No column details
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--accent)', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { schemaNode: SchemaNode };

export default function SchemaVisualizer({ data }: Props) {
  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div>
        <div className="panel-header">
          <h3 className="panel-title">🗺️ Schema Visualization</h3>
        </div>
        <div className="viz-container">
          <div className="viz-empty">
            <div className="viz-empty-icon">🗺️</div>
            <div>Add schema DDL to see an interactive ERD diagram</div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
              Paste CREATE TABLE statements in the schema input above
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-header">
        <h3 className="panel-title">🗺️ Schema Visualization</h3>
      </div>
      <div className="viz-container">
        <ReactFlow
          nodes={data.nodes}
          edges={data.edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          defaultEdgeOptions={{
            style: { stroke: 'var(--accent)', strokeWidth: 1.5 },
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border)" gap={20} size={1} />
          <Controls
            showInteractive={false}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
