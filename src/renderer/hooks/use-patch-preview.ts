import { useState, useCallback } from 'react';
import type { IpcResponse, PatchPreview } from '../../shared/types';
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
  const sessionState = useSessionStore((s) => s.sessionState);
  const taskState = useSessionStore((s) => s.taskState);
  const setView = useUIStore((s) => s.setView);

  const fetchPatchPreview = useCallback(async (): Promise<PatchPreview | null> => {
    if (!sessionState || !taskState) {
      setError('No active task');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const result: IpcResponse<unknown> = await window.coworkIPC.getPatchPreview({
      sessionId: sessionState.session.sessionId,
      taskId: taskState.taskId,
    });

    setIsLoading(false);

    if (result.success) {
      setView('patch');
      return result.data as PatchPreview;
    } else {
      setError(result.error.message);
      return null;
    }
  }, [sessionState, taskState, setView]);

  return { fetchPatchPreview, isLoading, error };
}
