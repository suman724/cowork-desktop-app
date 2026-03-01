import { useState, useCallback, useRef } from 'react';
// IPC types are inferred from window.coworkIPC
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';
import { useUIStore } from '../state/ui-store';

interface UseStartTask {
  startTask: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useStartTask(): UseStartTask {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const setTaskState = useSessionStore((s) => s.setTaskState);
  const addUserMessage = useMessagesStore((s) => s.addUserMessage);

  const startTask = useCallback(
    async (prompt: string) => {
      const sessionState = useSessionStore.getState().sessionState;
      if (!sessionState) {
        setError('No active session');
        return;
      }

      if (loadingRef.current) return;

      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const taskId = `task-${Date.now()}`;
      const settings = useUIStore.getState().settings;
      addUserMessage(prompt);

      setTaskState({
        taskId,
        sessionId: sessionState.session.sessionId,
        prompt,
        currentStep: 0,
        maxSteps: settings.maxStepsPerTask,
        isRunning: true,
      });

      try {
        const result = await window.coworkIPC.startTask({
          sessionId: sessionState.session.sessionId,
          taskId,
          prompt,
          taskOptions: {
            maxSteps: settings.maxStepsPerTask,
            approvalMode: settings.approvalMode,
          },
        });

        if (!result.success) {
          setError(result.error.message);
          useMessagesStore.getState().addSystemMessage(`Error: ${result.error.message}`);
          useSessionStore.getState().setTaskRunning(false);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        useMessagesStore.getState().addSystemMessage(`Error: ${message}`);
        useSessionStore.getState().setTaskRunning(false);
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [setTaskState, addUserMessage],
  );

  return { startTask, isLoading, error };
}
