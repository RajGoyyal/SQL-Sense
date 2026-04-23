'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { UserProgress } from '@/lib/types';
import { getDefaultProgress } from '@/lib/challenge-evaluator';

const STORAGE_KEY = 'sqlsense-progress-v1';

function generateClientId(): string {
  const key = 'sqlsense-client-id';
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const next = `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  localStorage.setItem(key, next);
  return next;
}

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress());
  const [clientId, setClientId] = useState<string>('anonymous');

  useEffect(() => {
    const id = generateClientId();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientId(id);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserProgress;
        setProgress(parsed);
      }
    } catch {
      // Ignore malformed local storage entries.
    }

    fetch(`/api/progress?clientId=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.success && payload?.data) {
          setProgress(payload.data as UserProgress);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.data));
        }
      })
      .catch(() => {
        // Network sync is optional for v1.
      });
  }, []);

  const save = useCallback((next: UserProgress) => {
    setProgress(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors.
    }

    fetch(`/api/progress?clientId=${encodeURIComponent(clientId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {
      // Network sync is best effort only.
    });
  }, [clientId]);

  const toggleGamification = useCallback(() => {
    save({ ...progress, gamificationEnabled: !progress.gamificationEnabled });
  }, [progress, save]);

  const completionPct = useMemo(() => {
    const total = progress.weeklyGoals.reduce((sum, goal) => sum + goal.target, 0);
    const done = progress.weeklyGoals.reduce((sum, goal) => sum + goal.progress, 0);
    if (total === 0) {
      return 0;
    }
    return Math.min(100, Math.round((done / total) * 100));
  }, [progress]);

  return { progress, save, toggleGamification, completionPct, clientId };
}
