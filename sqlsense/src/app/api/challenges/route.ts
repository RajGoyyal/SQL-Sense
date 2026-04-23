import { NextRequest, NextResponse } from 'next/server';
import { CHALLENGES, LEARNING_PATHS } from '@/lib/challenges';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');
  const difficulty = request.nextUrl.searchParams.get('difficulty');

  const filtered = CHALLENGES.filter((challenge) => {
    if (category && challenge.category !== category) {
      return false;
    }
    if (difficulty && challenge.difficulty !== difficulty) {
      return false;
    }
    return true;
  });

  return NextResponse.json({
    success: true,
    data: {
      challenges: filtered,
      learningPaths: LEARNING_PATHS,
    },
  });
}
