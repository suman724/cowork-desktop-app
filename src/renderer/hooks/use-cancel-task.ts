import { useState, useCallback } from 'react';
// IPC types are inferred from window.coworkIPC
import { useSessionStore } from '../state/session-store';

interface UseCancelTask {
  cancelTask: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useCancelTask(): UseCancelTask {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelTask = useCallback(async () => {
    const sessionState = useSessionStore.getState().sessionState;
    const taskState = useSessionStore.getState().taskState;
    if (!sessionState || !taskState) {
      setError('No active task');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.coworkIPC.cancelTask({
        sessionId: sessionState.session.sessionId,
        taskId: taskState.taskId,
      });

      if (!result.success) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { cancelTask, isLoading, error };
}
