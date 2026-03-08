import { useState, useCallback, useRef } from 'react';
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';
import { useUIStore } from '../state/ui-store';

interface StartChatOptions {
  planOnly?: boolean;
}

interface UseAutoSession {
  startChat: (prompt: string, options?: StartChatOptions) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Combines CreateSession + StartTask into a single user action.
 * Used by HomeView to start a new chat with one prompt submission.
 */
export function useAutoSession(): UseAutoSession {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const startChat = useCallback(async (prompt: string, options?: StartChatOptions) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    const settings = useUIStore.getState().settings;
    const workspacePath = useSessionStore.getState().workspacePath;

    try {
      // Step 1: Create session
      const sessionResult = await window.coworkIPC.createSession({
        tenantId: settings.tenantId ?? 'dev-tenant',
        userId: settings.userId ?? 'dev-user',
        workspaceHint: workspacePath ? { localPaths: [workspacePath] } : undefined,
      });

      if (!sessionResult.success) {
        setError(sessionResult.error.message);
        return;
      }

      const sessionState = sessionResult.data;
      useSessionStore.getState().setSessionState(sessionState);
      useSessionStore.getState().clearPlanState();
      useMessagesStore.getState().clear();

      // Step 2: Start task (must be sequential — needs sessionId from step 1)
      const taskId = `task-${Date.now()}`;
      useMessagesStore.getState().addUserMessage(prompt);
      useSessionStore.getState().setTaskState({
        taskId,
        sessionId: sessionState.sessionId,
        prompt,
        currentStep: 0,
        maxSteps: settings.maxStepsPerTask,
        isRunning: true,
      });

      const taskResult = await window.coworkIPC.startTask({
        sessionId: sessionState.sessionId,
        taskId,
        prompt,
        taskOptions: {
          maxSteps: settings.maxStepsPerTask,
          approvalMode: settings.approvalMode,
          ...(options?.planOnly ? { planOnly: true } : {}),
        },
      });

      if (!taskResult.success) {
        setError(taskResult.error.message);
        useMessagesStore.getState().addSystemMessage(`Error: ${taskResult.error.message}`);
        useSessionStore.getState().setTaskRunning(false);
      }

      // Navigate to conversation view
      useUIStore.getState().setView('conversation');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  return { startChat, isLoading, error };
}
