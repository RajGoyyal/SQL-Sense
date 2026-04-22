'use client';

import type { HistoryEntry } from '@/hooks/useHistory';

interface Props {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function HistoryDrawer({ open, onClose, history, onSelect, onRemove, onClear }: Props) {
  if (!open) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const truncateSQL = (sql: string, max = 80) => {
    const oneLine = sql.replace(/\s+/g, ' ').trim();
    return oneLine.length > max ? oneLine.slice(0, max) + '...' : oneLine;
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h3>🕐 Query History</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {history.length > 0 && (
              <button className="drawer-clear-btn" onClick={onClear}>Clear All</button>
            )}
            <button className="drawer-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="drawer-body">
          {history.length === 0 ? (
            <div className="drawer-empty">
              <div style={{ fontSize: '2rem', opacity: 0.4, marginBottom: 8 }}>🕐</div>
              <div>No history yet</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                Analyzed queries will appear here
              </div>
            </div>
          ) : (
            <div className="history-list">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className="history-item"
                  onClick={() => { onSelect(entry); onClose(); }}
                >
                  <div className="history-item-top">
                    <span className="history-item-type">{entry.queryType || 'SQL'}</span>
                    <span className="history-item-time">{formatTime(entry.timestamp)}</span>
                  </div>
                  <div className="history-item-sql">{truncateSQL(entry.sql)}</div>
                  <div className="history-item-bottom">
                    <span className="history-item-dialect">{entry.dialect}</span>
                    {entry.score !== undefined && (
                      <span className={`history-item-score ${entry.score >= 80 ? 'good' : entry.score >= 50 ? 'fair' : 'poor'}`}>
                        Score: {entry.score}
                      </span>
                    )}
                    <button
                      className="history-item-remove"
                      onClick={e => { e.stopPropagation(); onRemove(entry.id); }}
                      title="Remove from history"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
