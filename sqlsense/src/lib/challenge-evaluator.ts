import { getChallengeById } from '@/lib/challenges';
import type {
  ChallengeAttempt,
  ChallengeEvaluation,
  UserProgress,
  WeeklyGoal,
  Badge,
} from '@/lib/types';

const BASE_WEEKLY_GOALS: WeeklyGoal[] = [
  { id: 'wg-1', label: 'Solve 3 challenges', target: 3, progress: 0, completed: false },
  { id: 'wg-2', label: 'Earn 300 XP', target: 300, progress: 0, completed: false },
];

const BASE_BADGES: Badge[] = [
  { id: 'bdg-1', name: 'First Blood', description: 'Solve your first challenge.' },
  { id: 'bdg-2', name: 'First 5 Solved', description: 'Solve five challenges.' },
  { id: 'bdg-3', name: 'No SELECT * Week', description: 'Solve weekly goals without SELECT *.' },
];

export function getDefaultProgress(): UserProgress {
  return {
    streakDays: 0,
    xp: 0,
    level: 1,
    solvedCount: 0,
    badges: BASE_BADGES,
    weeklyGoals: BASE_WEEKLY_GOALS,
    gamificationEnabled: true,
  };
}

export function evaluateChallengeAttempt(attempt: ChallengeAttempt): ChallengeEvaluation {
  const challenge = getChallengeById(attempt.challengeId);
  if (!challenge) {
    return {
      score: 0,
      passed: false,
      feedback: ['Challenge not found. Please refresh and try again.'],
      xpEarned: 0,
    };
  }

  const normalizedSql = attempt.sql.trim().toLowerCase();
  let score = 100;
  const feedback: string[] = [];

  for (const pattern of challenge.expectedPatterns) {
    if (!normalizedSql.includes(pattern.toLowerCase())) {
      score -= 14;
      feedback.push(`Missing expected construct: ${pattern}`);
    }
  }

  for (const pattern of challenge.forbiddenPatterns ?? []) {
    if (normalizedSql.includes(pattern.toLowerCase())) {
      score -= 20;
      feedback.push(`Avoid pattern for this challenge: ${pattern}`);
    }
  }

  if (attempt.elapsedSec > challenge.timeLimitSec) {
    score -= 10;
    feedback.push('Time exceeded. Try improving speed and query planning.');
  }

  if (attempt.usedHints > 0) {
    score -= Math.min(15, attempt.usedHints * 5);
    feedback.push(`Hint usage penalty applied (${attempt.usedHints} hints).`);
  }

  score = Math.max(0, Math.min(100, score));
  const passed = score >= 70;

  if (passed) {
    feedback.unshift('Strong attempt. Challenge passed.');
  } else {
    feedback.unshift('Attempt not passed yet. Refine query and retry.');
  }

  const nextHint = !passed && attempt.usedHints < challenge.hints.length
    ? challenge.hints[attempt.usedHints]
    : undefined;

  const xpEarned = passed ? 60 + Math.round(score / 5) : 10;

  return { score, passed, feedback, nextHint, xpEarned };
}

export function applyProgressUpdate(
  progress: UserProgress,
  attempt: ChallengeAttempt,
  evaluation: ChallengeEvaluation
): UserProgress {
  const next: UserProgress = {
    ...progress,
    badges: progress.badges.map((badge) => ({ ...badge })),
    weeklyGoals: progress.weeklyGoals.map((goal) => ({ ...goal })),
  };

  if (evaluation.passed) {
    next.solvedCount += 1;
    next.lastSolvedAt = Date.now();
    next.streakDays = computeStreakDays(progress.lastSolvedAt);
  }

  next.xp += evaluation.xpEarned;
  next.level = Math.max(1, Math.floor(next.xp / 250) + 1);

  for (const goal of next.weeklyGoals) {
    if (goal.id === 'wg-1' && evaluation.passed) {
      goal.progress = Math.min(goal.target, goal.progress + 1);
    }
    if (goal.id === 'wg-2') {
      goal.progress = Math.min(goal.target, goal.progress + evaluation.xpEarned);
    }
    goal.completed = goal.progress >= goal.target;
  }

  unlockBadges(next, attempt, evaluation);

  return next;
}

function unlockBadges(progress: UserProgress, attempt: ChallengeAttempt, evaluation: ChallengeEvaluation) {
  const now = Date.now();

  const firstSolved = progress.badges.find((badge) => badge.id === 'bdg-1');
  if (firstSolved && !firstSolved.unlockedAt && evaluation.passed) {
    firstSolved.unlockedAt = now;
  }

  const fiveSolved = progress.badges.find((badge) => badge.id === 'bdg-2');
  if (fiveSolved && !fiveSolved.unlockedAt && progress.solvedCount >= 5) {
    fiveSolved.unlockedAt = now;
  }

  const noStarWeek = progress.badges.find((badge) => badge.id === 'bdg-3');
  if (
    noStarWeek &&
    !noStarWeek.unlockedAt &&
    !attempt.sql.toLowerCase().includes('select *') &&
    progress.weeklyGoals.every((goal) => goal.completed)
  ) {
    noStarWeek.unlockedAt = now;
  }
}

function computeStreakDays(lastSolvedAt?: number): number {
  if (!lastSolvedAt) {
    return 1;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const diff = Date.now() - lastSolvedAt;

  if (diff <= oneDayMs * 2) {
    return 2;
  }

  return 1;
}
