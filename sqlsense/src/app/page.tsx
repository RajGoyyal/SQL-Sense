'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import SqlEditor from '@/components/SqlEditor';
import ExamplePicker from '@/components/ExamplePicker';
import ExplanationPanel from '@/components/ExplanationPanel';
import OptimizationPanel from '@/components/OptimizationPanel';
import IndexPanel from '@/components/IndexPanel';
import SummaryPanel from '@/components/SummaryPanel';
import SchemaVisualizer from '@/components/SchemaVisualizer';
import HistoryDrawer from '@/components/HistoryDrawer';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import LiveCoachPanel from '@/components/LiveCoachPanel';
import PracticeArena from '@/components/PracticeArena';
import CompareVariants from '@/components/CompareVariants';
import LearningPaths from '@/components/LearningPaths';
import ProgressPanel from '@/components/ProgressPanel';
import { useToast } from '@/components/Toast';
import { useAnalyze } from '@/hooks/useAnalyze';
import { useHistory } from '@/hooks/useHistory';
import { useTheme } from '@/hooks/useTheme';
import { useChallenges } from '@/hooks/useChallenges';
import { useProgress } from '@/hooks/useProgress';
import { formatSQL } from '@/lib/parser';
import type { ExampleQuery, SqlDialect, AnalysisResult } from '@/lib/types';

const TABS = [
  { id: 'explanation', label: 'Explanation', shortcut: '1' },
  { id: 'optimization', label: 'Optimize', shortcut: '2' },
  { id: 'indexes', label: 'Indexes', shortcut: '3' },
  { id: 'summary', label: 'Summary', shortcut: '4' },
  { id: 'visualization', label: 'Schema', shortcut: '5' },
  { id: 'learning', label: 'Learning Paths', shortcut: '6' },
  { id: 'practice', label: 'Practice Arena', shortcut: '7' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function HomePage() {
  const [sqlValue, setSqlValue] = useState('');
  const [schemaValue, setSchemaValue] = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [dialect, setDialect] = useState<SqlDialect>('mysql');
  const [activeTab, setActiveTab] = useState<TabId>('explanation');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const { result, meta, error, errorSuggestion, loading, analyze } = useAnalyze();
  const { history, addEntry, removeEntry, clearHistory } = useHistory();
  const { toggle: toggleTheme } = useTheme();
  const { challenges, learningPaths } = useChallenges();
  const { progress, save: saveProgress, toggleGamification, completionPct, clientId } = useProgress();
  const { toast } = useToast();

  // Save to history when analysis succeeds
  useEffect(() => {
    if (result && sqlValue) {
      addEntry({
        sql: sqlValue,
        schema: schemaValue || undefined,
        dialect,
        score: result.optimization.score,
        queryType: result.summary.queryType,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Load from URL hash on mount
  useEffect(() => {
    let frame = 0;
    try {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const decoded = JSON.parse(decodeURIComponent(atob(hash)));
        frame = window.requestAnimationFrame(() => {
          if (decoded.sql) {
            setSqlValue(decoded.sql);
            if (decoded.schema) { setSchemaValue(decoded.schema); setShowSchema(true); }
            if (decoded.dialect) setDialect(decoded.dialect);
            toast('Query loaded from shared link!', 'info');
          }
        });
      }
    } catch { /* ignore invalid hash */ }
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!sqlValue.trim()) return;
    analyze(sqlValue, schemaValue || undefined, dialect);
  }, [sqlValue, schemaValue, dialect, analyze]);

  const handleExample = useCallback((example: ExampleQuery) => {
    setSqlValue(example.sql);
    if (example.schema) {
      setSchemaValue(example.schema);
      setShowSchema(true);
    } else {
      setSchemaValue('');
      setShowSchema(false);
    }
    toast(`Loaded: ${example.name}`, 'info');
  }, [toast]);

  const handleFormat = useCallback(() => {
    if (!sqlValue.trim()) return;
    try {
      const formatted = formatSQL(sqlValue, dialect);
      setSqlValue(formatted);
      toast('SQL formatted!', 'success');
    } catch {
      toast('Could not format - check syntax', 'warning');
    }
  }, [sqlValue, dialect, toast]);

  const handleShare = useCallback(() => {
    try {
      const payload: Record<string, string> = { sql: sqlValue };
      if (schemaValue) payload.schema = schemaValue;
      if (dialect !== 'mysql') payload.dialect = dialect;
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      navigator.clipboard.writeText(url);
      toast('Share link copied to clipboard!', 'success');
    } catch {
      toast('Failed to create share link', 'error');
    }
  }, [sqlValue, schemaValue, dialect, toast]);

  const handleExportReport = useCallback(() => {
    if (!result) return;
    const report = generateMarkdownReport(sqlValue, result, meta);
    navigator.clipboard.writeText(report);
    toast('Full report copied as Markdown!', 'success');
  }, [result, sqlValue, meta, toast]);

  const handleHistorySelect = useCallback((entry: { sql: string; schema?: string; dialect: string }) => {
    setSqlValue(entry.sql);
    if (entry.schema) {
      setSchemaValue(entry.schema);
      setShowSchema(true);
    }
    setDialect(entry.dialect as SqlDialect);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter: Analyze
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyze();
        return;
      }
      // Ctrl+Shift+F: Format
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        handleFormat();
        return;
      }
      // Ctrl+Shift+S: Share
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        handleShare();
        return;
      }
      // Ctrl+Shift+H: History
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        setHistoryOpen(prev => !prev);
        return;
      }
      // Ctrl+Shift+D: Dark mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        toggleTheme();
        return;
      }
      // Escape: close modals
      if (e.key === 'Escape') {
        setHistoryOpen(false);
        setShortcutsOpen(false);
        return;
      }
      // Number keys 1-7 for tabs
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= TABS.length) {
          const target = document.activeElement?.tagName;
          if (target !== 'INPUT' && target !== 'TEXTAREA' && !document.activeElement?.classList.contains('cm-content')) {
            setActiveTab(TABS[num - 1].id);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAnalyze, handleFormat, handleShare, toggleTheme, result]);

  return (
    <div className="app-container">
      <Header
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        historyCount={history.length}
      />

      {/* Hero */}
      <div className="hero">
        <h1 className="hero-title">Understand your SQL instantly</h1>
        <p className="hero-subtitle">
          Paste a query to get a plain-English explanation, optimization hints, index suggestions, and schema visualization.
        </p>
        <div className="hero-shortcut">
          <kbd className="kbd">Ctrl</kbd><span className="shortcut-plus">+</span><kbd className="kbd">Enter</kbd>
          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>to analyze</span>
        </div>
      </div>

      {/* Input Section */}
      <div className="input-section">
        <div className="input-section-header">
          <span className="input-label">SQL Query</span>
          <ExamplePicker onSelect={handleExample} />
        </div>

        <SqlEditor
          value={sqlValue}
          onChange={setSqlValue}
          placeholder="Paste your SQL query here..."
          height="180px"
        />

        {/* Schema toggle */}
        <button className="schema-toggle" onClick={() => setShowSchema(!showSchema)}>
          <span className={`chevron ${showSchema ? 'open' : ''}`}>▶</span>
          Schema DDL (optional)
        </button>

        {showSchema && (
          <div className="schema-editor" style={{ animation: 'slideDown .3s ease' }}>
            <SqlEditor
              value={schemaValue}
              onChange={setSchemaValue}
              placeholder="Paste CREATE TABLE statements here for schema-aware analysis..."
              height="140px"
            />
          </div>
        )}

        {/* Controls */}
        <div className="controls-row">
          <div className="controls-left">
            <select
              className="dialect-select"
              value={dialect}
              onChange={e => setDialect(e.target.value as SqlDialect)}
            >
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="sqlite">SQLite</option>
              <option value="mariadb">MariaDB</option>
              <option value="transactsql">SQL Server</option>
            </select>
            <button className="secondary-btn" onClick={handleFormat} disabled={!sqlValue.trim()} title="Format SQL (Ctrl+Shift+F)">
              Format
            </button>
            <button className="secondary-btn" onClick={handleShare} disabled={!sqlValue.trim()} title="Share query URL (Ctrl+Shift+S)">
              Share
            </button>
            {result && (
              <button className="secondary-btn" onClick={handleExportReport} title="Export full analysis as Markdown">
                Export Report
              </button>
            )}
          </div>
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !sqlValue.trim()}
          >
            {loading && <span className="spinner" />}
            {loading ? 'Analyzing...' : 'Analyze Query'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-alert" style={{ animation: 'shake .4s ease' }}>
          <span className="error-icon">!</span>
          <div>
            <div className="error-message">{error}</div>
            {errorSuggestion && <div className="error-suggestion">{errorSuggestion}</div>}
          </div>
        </div>
      )}

      <div className="coach-progress-grid">
        <LiveCoachPanel meta={meta} loading={loading} />
        <ProgressPanel
          progress={progress}
          completionPct={completionPct}
          onToggleGamification={toggleGamification}
        />
      </div>
      {/* Main tabs */}
      <div className="result-section">
        <div className="tab-bar">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={`Press ${i + 1} to switch`}
            >
              {tab.label}
              <span className="tab-shortcut">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="tab-content">
          {activeTab === 'learning' && (
            <LearningPaths
              paths={learningPaths}
              challenges={challenges}
              onSelectChallenge={(id) => {
                setSelectedChallengeId(id);
                setActiveTab('practice');
              }}
            />
          )}
          {activeTab === 'practice' && (
            <PracticeArena
              challenges={challenges}
              selectedId={selectedChallengeId}
              onSelect={setSelectedChallengeId}
              clientId={clientId}
              progress={progress}
              onProgressUpdate={saveProgress}
            />
          )}
          {activeTab === 'explanation' && result && <ExplanationPanel data={result.explanation} />}
          {activeTab === 'optimization' && result && <OptimizationPanel data={result.optimization} />}
          {activeTab === 'indexes' && result && <IndexPanel data={result.indexes} />}
          {activeTab === 'summary' && result && <SummaryPanel data={result.summary} />}
          {activeTab === 'visualization' && result && <SchemaVisualizer data={result.visualization} />}
          {!result && activeTab !== 'learning' && activeTab !== 'practice' && (
            <div className="empty-state" style={{ padding: '28px 12px' }}>
              <h3>Run analysis first</h3>
              <p>Analyze a query to unlock explanation, optimization, indexes, summary, and schema tabs.</p>
            </div>
          )}
        </div>
        {meta && result && (
          <div className="meta-bar">
            <span>Parsed in {meta.parseTimeMs}ms</span>
            <span>Analyzed in {meta.analyzeTimeMs}ms</span>
            <span>{meta.dialect}</span>
            <span>Score: {result.optimization.score}/100</span>
          </div>
        )}
      </div>

      {/* Interactive features */}
      <section className="interactive-section">
        <CompareVariants dialect={dialect} />
      </section>

      {/* Empty state */}
      {!result && !error && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">Search</div>
          <h3>Ready to analyze</h3>
          <p>Paste your SQL query above and click &quot;Analyze Query&quot; or press <kbd className="kbd" style={{ fontSize: '.75rem' }}>Ctrl+Enter</kbd> to get started.</p>
          <p style={{ marginTop: 8, fontSize: '.8rem' }}>Try one of the example queries above!</p>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div>Built by SQLSense | <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a> | MIT License</div>
        <div style={{ marginTop: 4, fontSize: '.75rem' }}>
          Press <kbd className="kbd" style={{ fontSize: '.65rem' }}>Keys</kbd> for keyboard shortcuts
        </div>
      </footer>

      {/* Modals */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={handleHistorySelect}
        onRemove={removeEntry}
        onClear={clearHistory}
      />
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}

// â”€â”€â”€ Markdown Report Generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function generateMarkdownReport(sql: string, result: AnalysisResult, meta: { parseTimeMs: number; analyzeTimeMs: number } | null): string {
  const lines = [
    '# SQLSense Analysis Report',
    '',
    '## Query',
    '```sql',
    sql,
    '```',
    '',
    '## Explanation',
    result.explanation.summary,
    '',
    ...result.explanation.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `## Optimization Score: ${result.optimization.score}/100`,
    '',
  ];

  if (result.optimization.hints.length > 0) {
    lines.push('### Hints');
    for (const h of result.optimization.hints) {
      lines.push(`- **[${h.severity.toUpperCase()}] ${h.title}**: ${h.message}`);
      lines.push(`  - Tip: ${h.suggestion}`);
    }
    lines.push('');
  }

  if (result.indexes.length > 0) {
    lines.push('## Index Suggestions');
    for (const idx of result.indexes) {
      lines.push(`- **${idx.table}** (${idx.type}): \`${idx.columns.join(', ')}\``);
      lines.push(`  - ${idx.reasoning}`);
    }
    lines.push('');
  }

  lines.push('## Summary');
  lines.push(`- Query Type: ${result.summary.queryType}`);
  lines.push(`- Tables: ${result.summary.tables.map(t => t.name).join(', ')}`);
  lines.push(`- Joins: ${result.summary.joins.length}`);
  lines.push(`- Filters: ${result.summary.filters.length}`);
  lines.push(`- Aggregates: ${result.summary.aggregates.join(', ') || 'none'}`);
  lines.push('');
  lines.push('---');
  lines.push(`*Generated by [SQLSense](https://sqlsense.vercel.app) in ${(meta?.parseTimeMs || 0) + (meta?.analyzeTimeMs || 0)}ms*`);

  return lines.join('\n');
}

