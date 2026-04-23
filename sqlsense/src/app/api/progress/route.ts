import { NextRequest, NextResponse } from 'next/server';
import type { UserProgress } from '@/lib/types';
import { resolveProgressStore } from '@/lib/progress-store';

export const runtime = 'nodejs';

function getClientId(request: NextRequest): string {
  return request.nextUrl.searchParams.get('clientId')
    || request.headers.get('x-client-id')
    || 'anonymous';
}

export async function GET(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const store = resolveProgressStore();
    const progress = await store.getProgress(clientId);

    return NextResponse.json({ success: true, data: progress });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load progress.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const progress = (await request.json()) as UserProgress;
    const store = resolveProgressStore();
    const saved = await store.saveProgress(clientId, progress);

    return NextResponse.json({ success: true, data: saved });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save progress.' }, { status: 500 });
  }
}
