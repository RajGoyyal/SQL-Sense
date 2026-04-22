'use client';

import type { QuerySummary } from '@/lib/types';

interface Props {
  data: QuerySummary;
}

/**
 * SVG Radar/Spider chart showing query complexity across multiple axes.
 */
export default function ComplexityRadar({ data }: Props) {
  const axes = [
    { label: 'Tables', value: Math.min(data.tables.length / 5, 1), raw: data.tables.length },
    { label: 'Joins', value: Math.min(data.joins.length / 4, 1), raw: data.joins.length },
    { label: 'Filters', value: Math.min(data.filters.length / 5, 1), raw: data.filters.length },
    { label: 'Aggregates', value: Math.min(data.aggregates.length / 3, 1), raw: data.aggregates.length },
    { label: 'Subqueries', value: Math.min(data.subqueries / 3, 1), raw: data.subqueries },
    { label: 'Grouping', value: Math.min(data.groupBy.length / 3, 1), raw: data.groupBy.length },
  ];

  const cx = 150, cy = 130, maxR = 90;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, radius: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon
  const dataPoints = axes.map((a, i) => getPoint(i, Math.max(a.value, 0.08) * maxR));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Complexity score
  const totalComplexity = axes.reduce((sum, a) => sum + a.value, 0) / axes.length;
  const complexityLabel = totalComplexity > 0.65 ? 'High' : totalComplexity > 0.3 ? 'Medium' : 'Low';
  const complexityColor = totalComplexity > 0.65 ? 'var(--danger)' : totalComplexity > 0.3 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="complexity-container">
      <div className="complexity-header">
        <h4 style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Query Complexity</h4>
        <span className="complexity-badge" style={{ background: complexityColor + '22', color: complexityColor }}>
          {complexityLabel}
        </span>
      </div>
      <svg viewBox="0 0 300 270" className="complexity-radar">
        {/* Grid rings */}
        {rings.map((r, i) => (
          <polygon
            key={i}
            points={Array.from({ length: n }, (_, j) => {
              const p = getPoint(j, r * maxR);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            opacity={0.6}
          />
        ))}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const p = getPoint(i, maxR);
          return (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="0.5" opacity={0.4} />
          );
        })}

        {/* Data polygon */}
        <path d={dataPath} fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="2" />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent)" stroke="var(--bg-secondary)" strokeWidth="2">
            <title>{axes[i].label}: {axes[i].raw}</title>
          </circle>
        ))}

        {/* Labels */}
        {axes.map((a, i) => {
          const p = getPoint(i, maxR + 22);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fill="var(--text-secondary)"
              fontFamily="var(--font-sans)"
            >
              {a.label} ({a.raw})
            </text>
          );
        })}
      </svg>
    </div>
  );
}
