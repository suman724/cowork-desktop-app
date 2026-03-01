import { useState, useCallback } from 'react';
import type { PatchPreview } from '../../shared/types';
import { useSessionStore } from '../state/session-store';
import { useUIStore } from '../state/ui-store';

interface UsePatchPreview {
  fetchPatchPreview: () => Promise<PatchPreview | null>;
  isLoading: boolean;
  error: string | null;
}

export function usePatchPreview(): UsePatchPreview {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setView = useUIStore((s) => s.setView);
  const setPatchPreview = useUIStore((s) => s.setPatchPreview);

  const fetchPatchPreview = useCallback(async (): Promise<PatchPreview | null> => {
    const sessionState = useSessionStore.getState().sessionState;
    const taskState = useSessionStore.getState().taskState;
    if (!sessionState || !taskState) {
      setError('No active task');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.coworkIPC.getPatchPreview({
        sessionId: sessionState.sessionId,
        taskId: taskState.taskId,
      });

      if (result.success) {
        const patch = result.data;
        setPatchPreview(patch);
        setView('patch');
        return patch;
      } else {
        setError(result.error.message);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setView, setPatchPreview]);

  return { fetchPatchPreview, isLoading, error };
}
