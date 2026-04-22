'use client';

import { useState, useCallback } from 'react';
import type { AnalysisResult, AnalysisMeta, SqlDialect } from '@/lib/types';

interface UseAnalyzeReturn {
  result: AnalysisResult | null;
  meta: AnalysisMeta | null;
  error: string | null;
  errorSuggestion: string | null;
  loading: boolean;
  analyze: (sql: string, schema?: string, dialect?: SqlDialect) => Promise<void>;
  reset: () => void;
}

export function useAnalyze(): UseAnalyzeReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [meta, setMeta] = useState<AnalysisMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async (sql: string, schema?: string, dialect?: SqlDialect) => {
    setLoading(true);
    setError(null);
    setErrorSuggestion(null);
    setResult(null);
    setMeta(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, schema, dialect: dialect || 'mysql' }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || 'Analysis failed.');
        setErrorSuggestion(data.error?.suggestion || null);
        return;
      }

      setResult(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError('Failed to connect to the analysis server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setMeta(null);
    setError(null);
    setErrorSuggestion(null);
  }, []);

  return { result, meta, error, errorSuggestion, loading, analyze, reset };
}
