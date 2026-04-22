'use client';

import type { QuerySummary } from '@/lib/types';
import CopyButton from './CopyButton';
import ComplexityRadar from './ComplexityRadar';
import QueryFlowDiagram from './QueryFlowDiagram';

interface Props {
  data: QuerySummary;
}

export default function SummaryPanel({ data }: Props) {
  const exportData = JSON.stringify(data, null, 2);

  return (
    <div>
      <div className="panel-header">
        <h3 className="panel-title">📋 Query Summary</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <CopyButton text={exportData} label="Copy JSON" />
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-stat">
          <div className="summary-stat-value">{data.queryType}</div>
          <div className="summary-stat-label">Query Type</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">{data.tables.length}</div>
          <div className="summary-stat-label">Tables</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">{data.joins.length}</div>
          <div className="summary-stat-label">Joins</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">{data.filters.length}</div>
          <div className="summary-stat-label">Filters</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">{data.aggregates.length}</div>
          <div className="summary-stat-label">Aggregates</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">{data.subqueries}</div>
          <div className="summary-stat-label">Subqueries</div>
        </div>
      </div>

      {/* Complexity Radar + Flow side by side */}
      <div className="summary-visual-row">
        <ComplexityRadar data={data} />
        <QueryFlowDiagram data={data} />
      </div>

      <div className="summary-details" style={{ marginTop: 24 }}>
        {data.tables.length > 0 && (
          <div className="summary-row">
            <span className="summary-key">Tables</span>
            <span className="summary-val">
              {data.tables.map((t, i) => (
                <span key={i} className="badge">
                  {t.name}{t.alias ? ` (${t.alias})` : ''}
                </span>
              ))}
            </span>
          </div>
        )}

        {data.columns.length > 0 && data.columns[0] !== '*' && (
          <div className="summary-row">
            <span className="summary-key">Columns</span>
            <span className="summary-val">
              {data.columns.map((c, i) => (
                <span key={i} className="badge">{c}</span>
              ))}
            </span>
          </div>
        )}

        {data.joins.length > 0 && (
          <div className="summary-row">
            <span className="summary-key">Joins</span>
            <span className="summary-val">
              {data.joins.map((j, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <span className="badge">{j.type}</span> {j.from} → {j.to}
                  {j.on && <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}> ON {j.on}</span>}
                </div>
              ))}
            </span>
          </div>
        )}

        {data.filters.length > 0 && (
          <div className="summary-row">
            <span className="summary-key">Filters</span>
            <span className="summary-val">
              {data.filters.map((f, i) => (
                <div key={i} style={{ marginBottom: 2 }}>{f}</div>
              ))}
            </span>
          </div>
        )}

        {data.groupBy.length > 0 && (
          <div className="summary-row">
            <span className="summary-key">Group By</span>
            <span className="summary-val">{data.groupBy.join(', ')}</span>
          </div>
        )}

        {data.orderBy.length > 0 && (
          <div className="summary-row">
            <span className="summary-key">Order By</span>
            <span className="summary-val">
              {data.orderBy.map((o, i) => (
                <span key={i} className="badge">{o.expr} {o.direction}</span>
              ))}
            </span>
          </div>
        )}

        {data.limit !== null && (
          <div className="summary-row">
            <span className="summary-key">Limit</span>
            <span className="summary-val">{data.limit}</span>
          </div>
        )}

        {(data.hasDistinct || data.hasHaving) && (
          <div className="summary-row">
            <span className="summary-key">Flags</span>
            <span className="summary-val">
              {data.hasDistinct && <span className="badge">DISTINCT</span>}
              {data.hasHaving && <span className="badge">HAVING</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
