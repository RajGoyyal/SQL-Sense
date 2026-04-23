'use client';

import type { UserProgress } from '@/lib/types';

interface Props {
  progress: UserProgress;
  completionPct: number;
  onToggleGamification: () => void;
}

export default function ProgressPanel({ progress, completionPct, onToggleGamification }: Props) {
  return (
    <section className="progress-card">
      <div className="progress-top">
        <div>
          <h3>Weekly Progress</h3>
          <p className="progress-meta">Streak {progress.streakDays}d · Level {progress.level} · XP {progress.xp}</p>
        </div>
        <button className="secondary-btn" onClick={onToggleGamification}>
          Gamification: {progress.gamificationEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="progress-ring-wrap" aria-label="Weekly completion">
        <div className="progress-ring-label">{completionPct}%</div>
        <svg width="96" height="96" viewBox="0 0 96 96" className="progress-ring-svg">
          <circle cx="48" cy="48" r="42" className="progress-track" />
          <circle
            cx="48"
            cy="48"
            r="42"
            className="progress-stroke"
            style={{ strokeDashoffset: `${264 - (264 * completionPct) / 100}` }}
          />
        </svg>
      </div>

      <div className="goal-list">
        {progress.weeklyGoals.map((goal) => (
          <div className="goal-row" key={goal.id}>
            <span>{goal.label}</span>
            <strong>{goal.progress}/{goal.target}</strong>
          </div>
        ))}
      </div>

      {progress.gamificationEnabled && (
        <div className="badge-strip">
          {progress.badges.map((badge) => (
            <span key={badge.id} className={`badge-pill ${badge.unlockedAt ? 'unlocked' : ''}`}>
              {badge.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
