import { useState, useCallback } from 'react';
import type { IpcResponse } from '../../shared/types';
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';

interface UseStartTask {
  startTask: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useStartTask(): UseStartTask {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionState = useSessionStore((s) => s.sessionState);
  const setTaskState = useSessionStore((s) => s.setTaskState);
  const addUserMessage = useMessagesStore((s) => s.addUserMessage);

  const startTask = useCallback(
    async (prompt: string) => {
      if (!sessionState) {
        setError('No active session');
        return;
      }

      setIsLoading(true);
      setError(null);

      const taskId = `task-${Date.now()}`;
      addUserMessage(prompt);

      setTaskState({
        taskId,
        sessionId: sessionState.session.sessionId,
        prompt,
        currentStep: 0,
        maxSteps: sessionState.policyBundle.llmPolicy.maxOutputTokens,
        isRunning: true,
      });

      const result: IpcResponse<unknown> = await window.coworkIPC.startTask({
        sessionId: sessionState.session.sessionId,
        taskId,
        prompt,
      });

      if (!result.success) {
        setError(result.error.message);
        useMessagesStore.getState().addSystemMessage(`Error: ${result.error.message}`);
        useSessionStore.getState().setTaskRunning(false);
      }

      setIsLoading(false);
    },
    [sessionState, setTaskState, addUserMessage],
  );

  return { startTask, isLoading, error };
}
