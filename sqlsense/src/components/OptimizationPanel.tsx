'use client';

import type { OptimizationResult } from '@/lib/types';
import CopyButton from './CopyButton';

interface Props {
  data: OptimizationResult;
}

export default function OptimizationPanel({ data }: Props) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (data.score / 100) * circumference;

  const scoreColor = data.score >= 80 ? 'var(--success)' : data.score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const scoreLabel = data.score >= 80 ? 'Good' : data.score >= 50 ? 'Fair' : 'Needs Work';

  const copyText = [
    `Score: ${data.score}/100 (${scoreLabel})`,
    '',
    ...data.hints.map(h => `[${h.severity.toUpperCase()}] ${h.title}: ${h.message}\n  → ${h.suggestion}`),
  ].join('\n');

  return (
    <div>
      <div className="panel-header">
        <h3 className="panel-title">⚡ Optimization Analysis</h3>
        <CopyButton text={copyText} label="Copy" />
      </div>

      <div className="score-container">
        <div className="score-ring">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle className="track" cx="48" cy="48" r="40" />
            <circle
              className="progress"
              cx="48" cy="48" r="40"
              stroke={scoreColor}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="score-value" style={{ color: scoreColor }}>{data.score}</div>
        </div>
        <div className="score-label">
          <strong>{scoreLabel}</strong>
          {data.hints.length === 0
            ? 'No issues detected. Your query looks well-optimized!'
            : `Found ${data.hints.length} optimization ${data.hints.length === 1 ? 'hint' : 'hints'}`}
        </div>
      </div>

      {data.hints.length === 0 ? (
        <div className="no-hints">
          <div className="no-hints-icon">✅</div>
          No optimization issues found
        </div>
      ) : (
        <div className="hint-list">
          {data.hints.map((hint, i) => (
            <div key={i} className={`hint-card ${hint.severity}`}>
              <span className="hint-severity">{hint.severity}</span>
              <div className="hint-title">{hint.title}</div>
              <div className="hint-message">{hint.message}</div>
              <div className="hint-suggestion">{hint.suggestion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
