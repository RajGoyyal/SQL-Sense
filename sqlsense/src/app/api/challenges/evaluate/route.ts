import { NextRequest, NextResponse } from 'next/server';
import type { ChallengeAttempt } from '@/lib/types';
import { evaluateChallengeAttempt, applyProgressUpdate } from '@/lib/challenge-evaluator';
import { resolveProgressStore } from '@/lib/progress-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChallengeAttempt & { clientId?: string };

    if (!body.challengeId || !body.sql) {
      return NextResponse.json(
        { success: false, error: 'challengeId and sql are required.' },
        { status: 400 }
      );
    }

    const attempt: ChallengeAttempt = {
      challengeId: body.challengeId,
      sql: body.sql,
      elapsedSec: Math.max(0, body.elapsedSec || 0),
      usedHints: Math.max(0, body.usedHints || 0),
    };

    const evaluation = evaluateChallengeAttempt(attempt);

    const clientId = body.clientId || request.headers.get('x-client-id') || 'anonymous';
    const store = resolveProgressStore();
    const currentProgress = await store.getProgress(clientId);
    const nextProgress = applyProgressUpdate(currentProgress, attempt, evaluation);
    await store.saveProgress(clientId, nextProgress);

    return NextResponse.json({
      success: true,
      data: {
        evaluation,
        progress: nextProgress,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate challenge attempt.' },
      { status: 500 }
    );
  }
}
