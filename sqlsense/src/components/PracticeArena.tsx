'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Challenge, UserProgress, ChallengeEvaluation } from '@/lib/types';
import SqlEditor from './SqlEditor';

interface Props {
  challenges: Challenge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  clientId: string;
  progress: UserProgress;
  onProgressUpdate: (progress: UserProgress) => void;
}

export default function PracticeArena({
  challenges,
  selectedId,
  onSelect,
  clientId,
  progress,
  onProgressUpdate,
}: Props) {
  const selected = useMemo(
    () => challenges.find((challenge) => challenge.id === selectedId) ?? challenges[0],
    [challenges, selectedId]
  );

  const [sql, setSql] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [usedHints, setUsedHints] = useState(0);
  const [result, setResult] = useState<ChallengeEvaluation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setSql(selected.starterSql);
      setSeconds(0);
      setRunning(false);
      setUsedHints(0);
      setResult(null);
    });
    return () => window.cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const requestHint = () => {
    if (!selected) {
      return;
    }
    setUsedHints((prev) => Math.min(selected.hints.length, prev + 1));
  };

  const submit = async () => {
    if (!selected || !sql.trim()) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/challenges/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          challengeId: selected.id,
          sql,
          elapsedSec: seconds,
          usedHints,
        }),
      });
      const payload = await res.json();
      if (payload?.success) {
        setResult(payload.data.evaluation as ChallengeEvaluation);
        onProgressUpdate(payload.data.progress as UserProgress);
        setRunning(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!selected) {
    return <section className="arena-card"><p>No challenges available.</p></section>;
  }

  return (
    <section className="arena-card">
      <div className="arena-head">
        <h3>SQL Practice Arena</h3>
        <div className="arena-controls">
          <span className={`difficulty ${selected.difficulty}`}>{selected.difficulty}</span>
          <span className="timer-chip">{seconds}s / {selected.timeLimitSec}s</span>
        </div>
      </div>

      <div className="arena-selector">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            className={`challenge-pill ${challenge.id === selected.id ? 'active' : ''}`}
            onClick={() => onSelect(challenge.id)}
          >
            {challenge.title}
          </button>
        ))}
      </div>

      <p className="arena-desc">{selected.description}</p>
      <p className="arena-objective"><strong>Objective:</strong> {selected.objective}</p>

      <SqlEditor
        value={sql}
        onChange={setSql}
        placeholder="Write your challenge solution here..."
        height="170px"
      />

      <div className="arena-actions">
        <button className="secondary-btn" onClick={() => setRunning((prev) => !prev)}>
          {running ? 'Pause Timer' : 'Start Timer'}
        </button>
        <button className="secondary-btn" onClick={requestHint}>
          Use Hint ({usedHints})
        </button>
        <button className="analyze-btn" onClick={submit} disabled={loading}>
          {loading ? 'Evaluating...' : 'Submit Attempt'}
        </button>
      </div>

      {selected.hints.slice(0, usedHints).length > 0 && (
        <div className="hint-stack">
          {selected.hints.slice(0, usedHints).map((hint, idx) => (
            <div key={idx} className="hint-card info">
              <span className="hint-severity">Hint {idx + 1}</span>
              <div className="hint-message">{hint}</div>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className={`arena-result ${result.passed ? 'pass' : 'retry'}`}>
          <h4>{result.passed ? 'Challenge Cleared' : 'Try Again'}</h4>
          <p>Score: {result.score} · XP +{result.xpEarned}</p>
          <ul>
            {result.feedback.map((line, idx) => <li key={idx}>{line}</li>)}
          </ul>
          {result.nextHint && <p className="coach-prompt">Next hint: {result.nextHint}</p>}
        </div>
      )}

      <p className="arena-meta">Solved total: {progress.solvedCount}</p>
    </section>
  );
}
