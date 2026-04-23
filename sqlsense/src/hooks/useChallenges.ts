'use client';

import { useEffect, useState } from 'react';
import type { Challenge, LearningPath } from '@/lib/types';

interface ChallengePayload {
  challenges: Challenge[];
  learningPaths: LearningPath[];
}

export function useChallenges() {
  const [data, setData] = useState<ChallengePayload>({ challenges: [], learningPaths: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/challenges')
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.success && payload?.data) {
          setData(payload.data as ChallengePayload);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading };
}
