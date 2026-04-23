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

interface AnalyzeApiPayload {
  success?: boolean;
  data?: AnalysisResult;
  meta?: AnalysisMeta;
  error?: {
    message?: string;
    suggestion?: string;
  };
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
      const requestBody = JSON.stringify({ sql, schema, dialect: dialect || 'mysql' });
      let attempt = 0;
      let data: AnalyzeApiPayload | null = null;
      let res: Response | null = null;
      let contentType = '';
      let raw = '';

      while (attempt < 2) {
        attempt += 1;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal,
        });
        window.clearTimeout(timeout);

        contentType = res.headers.get('content-type') || '';
        raw = await res.text();
        data = contentType.includes('application/json') ? JSON.parse(raw) : null;

        // Retry once for transient server errors (common during local dev recompilation).
        if (res.ok || res.status < 500 || attempt === 2) {
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }

      if (!res) {
        setError('Failed to reach analysis API.');
        return;
      }

      if (!res.ok) {
        if (data?.error?.message) {
          setError(data.error.message);
          setErrorSuggestion(data.error?.suggestion || null);
          return;
        }

        setError(`Analysis request failed (${res.status}).`);
        if (!contentType.includes('application/json')) {
          setErrorSuggestion(
            'API endpoint is unavailable. Start with `npm run dev` or `npm run start`, not a static file server.'
          );
        } else {
          setErrorSuggestion(raw.slice(0, 140) || null);
        }
        return;
      }

      if (!data?.success) {
        setError(data?.error?.message || 'Analysis failed.');
        setErrorSuggestion(data?.error?.suggestion || null);
        return;
      }

      setResult(data.data || null);
      setMeta(data.meta || null);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Analysis timed out. Please retry with a smaller query.');
        setErrorSuggestion('If this persists, restart the dev server and try again.');
        return;
      }
      setError('Failed to connect to the analysis server.');
      setErrorSuggestion('Make sure the app is running via Next.js (`npm run dev` or `npm run start`).');
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
