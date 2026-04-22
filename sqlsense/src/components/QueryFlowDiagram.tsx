'use client';

import type { QuerySummary } from '@/lib/types';

interface Props {
  data: QuerySummary;
}

/**
 * Visual execution flow diagram showing the query pipeline.
 */
export default function QueryFlowDiagram({ data }: Props) {
  const stages: { icon: string; label: string; detail: string; active: boolean }[] = [];

  // FROM
  if (data.tables.length > 0) {
    stages.push({
      icon: '📂',
      label: 'FROM',
      detail: data.tables.map(t => t.alias ? `${t.name} (${t.alias})` : t.name).join(', '),
      active: true,
    });
  }

  // JOINs
  if (data.joins.length > 0) {
    for (const j of data.joins) {
      stages.push({
        icon: '🔗',
        label: j.type,
        detail: `${j.from} ↔ ${j.to}`,
        active: true,
      });
    }
  }

  // WHERE
  if (data.filters.length > 0) {
    stages.push({
      icon: '🔍',
      label: 'WHERE',
      detail: data.filters.length <= 2
        ? data.filters.join(' AND ')
        : `${data.filters.length} conditions`,
      active: true,
    });
  }

  // GROUP BY
  if (data.groupBy.length > 0) {
    stages.push({
      icon: '📊',
      label: 'GROUP BY',
      detail: data.groupBy.join(', '),
      active: true,
    });
  }

  // HAVING
  if (data.hasHaving) {
    stages.push({
      icon: '🎯',
      label: 'HAVING',
      detail: 'Group filter applied',
      active: true,
    });
  }

  // SELECT
  const selectDetail = data.columns[0] === '*'
    ? 'All columns (*)'
    : data.columns.length <= 3
      ? data.columns.join(', ')
      : `${data.columns.length} columns`;
  stages.push({
    icon: '📋',
    label: 'SELECT',
    detail: selectDetail,
    active: true,
  });

  // DISTINCT
  if (data.hasDistinct) {
    stages.push({
      icon: '✨',
      label: 'DISTINCT',
      detail: 'Remove duplicates',
      active: true,
    });
  }

  // ORDER BY
  if (data.orderBy.length > 0) {
    stages.push({
      icon: '↕️',
      label: 'ORDER BY',
      detail: data.orderBy.map(o => `${o.expr} ${o.direction}`).join(', '),
      active: true,
    });
  }

  // LIMIT
  if (data.limit !== null) {
    stages.push({
      icon: '📏',
      label: 'LIMIT',
      detail: `${data.limit} rows`,
      active: true,
    });
  }

  // Result
  stages.push({
    icon: '✅',
    label: 'RESULT',
    detail: `${data.queryType} output`,
    active: true,
  });

  return (
    <div>
      <h4 style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
        ⚙️ Execution Flow
      </h4>
      <div className="flow-pipeline">
        {stages.map((stage, i) => (
          <div key={i} className="flow-stage-wrapper">
            <div className={`flow-stage ${stage.active ? 'active' : ''}`}>
              <div className="flow-stage-icon">{stage.icon}</div>
              <div className="flow-stage-info">
                <div className="flow-stage-label">{stage.label}</div>
                <div className="flow-stage-detail">{stage.detail}</div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flow-connector">
                <div className="flow-connector-line" />
                <div className="flow-connector-arrow">▼</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
