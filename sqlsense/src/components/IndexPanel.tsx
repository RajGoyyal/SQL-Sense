'use client';

import type { IndexSuggestion } from '@/lib/types';
import CopyButton from './CopyButton';

interface Props {
  data: IndexSuggestion[];
}

export default function IndexPanel({ data }: Props) {
  const copyText = data.map(idx =>
    `CREATE INDEX idx_${idx.table}_${idx.columns.join('_')} ON ${idx.table}(${idx.columns.join(', ')});\n  -- ${idx.reasoning}`
  ).join('\n\n');

  if (data.length === 0) {
    return (
      <div>
        <div className="panel-header">
          <h3 className="panel-title">🔑 Index Suggestions</h3>
        </div>
        <div className="no-hints">
          <div className="no-hints-icon">📊</div>
          No index suggestions for this query. Add schema DDL for more detailed analysis.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="panel-header">
        <h3 className="panel-title">🔑 Index Suggestions</h3>
        <CopyButton text={copyText} label="Copy SQL" />
      </div>
      <div className="index-list">
        {data.map((idx, i) => (
          <div key={i} className="index-card">
            <div className="index-header">
              <span className="index-table">{idx.table}</span>
              <span className={`index-type ${idx.type}`}>{idx.type}</span>
            </div>
            <div className="index-columns">
              CREATE INDEX idx_{idx.table}_{idx.columns.join('_')} ON {idx.table}({idx.columns.join(', ')});
            </div>
            <div className="index-reasoning">{idx.reasoning}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
