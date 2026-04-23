'use client';

import type { LearningPath, Challenge } from '@/lib/types';

interface Props {
  paths: LearningPath[];
  challenges: Challenge[];
  onSelectChallenge: (id: string) => void;
}

export default function LearningPaths({ paths, challenges, onSelectChallenge }: Props) {
  if (paths.length === 0) {
    return null;
  }

  return (
    <section className="learning-paths">
      <div className="panel-header">
        <h3 className="panel-title">Learning Paths</h3>
      </div>
      <div className="path-grid">
        {paths.map((path) => (
          <article key={path.id} className="path-card">
            <h4>{path.title}</h4>
            <p>{path.subtitle}</p>
            <div className="path-chips">
              {path.challengeIds.map((challengeId) => {
                const challenge = challenges.find((entry) => entry.id === challengeId);
                if (!challenge) {
                  return null;
                }
                return (
                  <button key={challengeId} className="path-chip" onClick={() => onSelectChallenge(challengeId)}>
                    {challenge.title}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
