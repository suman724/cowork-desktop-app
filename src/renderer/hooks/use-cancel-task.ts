import { useState, useCallback } from 'react';
import type { IpcResponse } from '../../shared/types';
import { useSessionStore } from '../state/session-store';

interface UseCancelTask {
  cancelTask: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useCancelTask(): UseCancelTask {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionState = useSessionStore((s) => s.sessionState);
  const taskState = useSessionStore((s) => s.taskState);

  const cancelTask = useCallback(async () => {
    if (!sessionState || !taskState) {
      setError('No active task');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result: IpcResponse<unknown> = await window.coworkIPC.cancelTask({
      sessionId: sessionState.session.sessionId,
      taskId: taskState.taskId,
    });

    if (!result.success) {
      setError(result.error.message);
    }

    setIsLoading(false);
  }, [sessionState, taskState]);

  return { cancelTask, isLoading, error };
}
