'use client';

import { useState, useEffect, useCallback } from 'react';

export interface HistoryEntry {
  id: string;
  sql: string;
  schema?: string;
  dialect: string;
  timestamp: number;
  score?: number;
  queryType?: string;
}

const STORAGE_KEY = 'sqlsense-history';
const MAX_ENTRIES = 30;

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setHistory(prev => {
      // Avoid duplicates
      const deduplicated = prev.filter(e => e.sql.trim() !== entry.sql.trim());
      const newEntry: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };
      const updated = [newEntry, ...deduplicated].slice(0, MAX_ENTRIES);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}
