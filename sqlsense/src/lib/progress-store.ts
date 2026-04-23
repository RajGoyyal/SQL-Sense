import type { ProgressStore, UserProgress } from '@/lib/types';
import { getDefaultProgress } from '@/lib/challenge-evaluator';

const inMemoryProgress = new Map<string, UserProgress>();

export class LocalProgressStore implements ProgressStore {
  async getProgress(clientId: string): Promise<UserProgress> {
    const existing = inMemoryProgress.get(clientId);
    if (existing) {
      return existing;
    }

    const fresh = getDefaultProgress();
    inMemoryProgress.set(clientId, fresh);
    return fresh;
  }

  async saveProgress(clientId: string, progress: UserProgress): Promise<UserProgress> {
    inMemoryProgress.set(clientId, progress);
    return progress;
  }
}

export class RemoteProgressStore implements ProgressStore {
  // Stub for future account-based sync implementation.
  async getProgress(clientId: string): Promise<UserProgress> {
    void clientId;
    throw new Error('RemoteProgressStore is not enabled yet.');
  }

  async saveProgress(clientId: string, progress: UserProgress): Promise<UserProgress> {
    void clientId;
    void progress;
    throw new Error('RemoteProgressStore is not enabled yet.');
  }
}

export function resolveProgressStore(): ProgressStore {
  // Keep local-first behavior for v1.
  return new LocalProgressStore();
}
