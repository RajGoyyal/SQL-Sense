'use client';

import type { ExplanationResult } from '@/lib/types';
import CopyButton from './CopyButton';

interface Props {
  data: ExplanationResult;
}

export default function ExplanationPanel({ data }: Props) {
  const copyText = [data.summary, '', ...data.steps.map((s, i) => `${i + 1}. ${s}`)].join('\n');

  return (
    <div>
      <div className="panel-header">
        <h3 className="panel-title">📝 Plain-English Explanation</h3>
        <CopyButton text={copyText} label="Copy" />
      </div>
      <div className="explanation-summary">{data.summary}</div>
      {data.steps.length > 0 && (
        <>
          <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Step by step:
          </div>
          <ol className="explanation-steps">
            {data.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
