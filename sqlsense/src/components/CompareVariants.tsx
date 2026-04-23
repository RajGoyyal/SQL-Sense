'use client';

import { useState } from 'react';
import SqlEditor from './SqlEditor';
import type { AnalysisResult } from '@/lib/types';

interface CompareResult {
  a: AnalysisResult;
  b: AnalysisResult;
}

interface Props {
  dialect: string;
}

export default function CompareVariants({ dialect }: Props) {
  const [a, setA] = useState('SELECT id, name FROM students WHERE branch = "CSE";');
  const [b, setB] = useState('SELECT * FROM students WHERE branch = "CSE";');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runCompare = async () => {
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: a, dialect }),
        }).then((res) => res.json()),
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: b, dialect }),
        }).then((res) => res.json()),
      ]);

      if (resA?.success && resB?.success) {
        setResult({ a: resA.data, b: resB.data });
      }
    } finally {
      setLoading(false);
    }
  };

  const scoreDelta = result ? result.a.optimization.score - result.b.optimization.score : 0;
  const joinDelta = result ? result.a.summary.joins.length - result.b.summary.joins.length : 0;
  const filterDelta = result ? result.a.summary.filters.length - result.b.summary.filters.length : 0;

  return (
    <section className="compare-card">
      <div className="panel-header">
        <h3 className="panel-title">Compare Variants (A/B)</h3>
        <button className="analyze-btn" onClick={runCompare} disabled={loading}>
          {loading ? 'Comparing...' : 'Run A/B'}
        </button>
      </div>

      <div className="compare-grid">
        <div>
          <h4>Variant A</h4>
          <SqlEditor value={a} onChange={setA} height="140px" />
        </div>
        <div>
          <h4>Variant B</h4>
          <SqlEditor value={b} onChange={setB} height="140px" />
        </div>
      </div>

      {result && (
        <div className="compare-result">
          <p>A Score: <strong>{result.a.optimization.score}</strong> · Hints: {result.a.optimization.hints.length}</p>
          <p>B Score: <strong>{result.b.optimization.score}</strong> · Hints: {result.b.optimization.hints.length}</p>
          <p className={scoreDelta >= 0 ? 'delta-good' : 'delta-bad'}>
            Delta (A - B): {scoreDelta >= 0 ? '+' : ''}{scoreDelta}
          </p>
          <p>Join delta (A - B): {joinDelta >= 0 ? '+' : ''}{joinDelta}</p>
          <p>Filter delta (A - B): {filterDelta >= 0 ? '+' : ''}{filterDelta}</p>
        </div>
      )}
    </section>
  );
}
