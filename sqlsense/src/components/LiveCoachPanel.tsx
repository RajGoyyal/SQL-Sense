'use client';

import type { AnalysisMeta } from '@/lib/types';

interface Props {
  meta: AnalysisMeta | null;
  loading: boolean;
}

export default function LiveCoachPanel({ meta, loading }: Props) {
  const confidence = meta?.coaching?.confidence ?? 0;
  const nudges = meta?.coaching?.nudges ?? [];
  const improvePrompt = meta?.coaching?.improvePrompt;

  return (
    <section className="coach-card" aria-live="polite">
      <div className="coach-header">
        <h3>Live Coach Mode</h3>
        <span className="coach-pill">Confidence {confidence}%</span>
      </div>
      <div className="coach-meter" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${confidence}%` }} />
      </div>
      {loading && <p className="coach-muted">Analyzing your query and generating coaching nudges...</p>}
      {!loading && nudges.length === 0 && <p className="coach-muted">Run analysis to unlock inline coaching nudges.</p>}
      {nudges.length > 0 && (
        <ul className="coach-list">
          {nudges.map((nudge, idx) => (
            <li key={idx}>{nudge}</li>
          ))}
        </ul>
      )}
      {improvePrompt && <p className="coach-prompt">Try this next: {improvePrompt}</p>}
    </section>
  );
}
