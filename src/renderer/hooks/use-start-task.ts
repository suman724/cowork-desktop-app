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

/**
 * Ensure the agent runtime has an active session.
 *
 * When the user loaded a historical session from the sidebar, the runtime
 * may be stopped or unaware of that session.  In that case we create a new
 * runtime session (which also auto-starts the runtime) and update the store.
 *
 * Returns the live sessionId to use for StartTask, or null on failure.
 */
async function ensureRuntimeSession(): Promise<string | null> {
  const runtimeStatus = useSessionStore.getState().agentRuntimeStatus;

  // If runtime is already running, the current sessionState is live
  if (runtimeStatus === 'running') {
    return useSessionStore.getState().sessionState?.sessionId ?? null;
  }

  // Runtime is stopped/crashed — create a fresh session
  const settings = useUIStore.getState().settings;
  const workspacePath = useSessionStore.getState().workspacePath;

  const result = await window.coworkIPC.createSession({
    tenantId: settings.tenantId ?? 'dev-tenant',
    userId: settings.userId ?? 'dev-user',
    workspaceHint: workspacePath ? { localPaths: [workspacePath] } : undefined,
  });

  if (!result.success) {
    return null;
  }

  useSessionStore.getState().setSessionState(result.data);
  return result.data.sessionId;
}

export function useStartTask(): UseStartTask {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const setTaskState = useSessionStore((s) => s.setTaskState);
  const addUserMessage = useMessagesStore((s) => s.addUserMessage);

  const startTask = useCallback(
    async (prompt: string) => {
      if (!useSessionStore.getState().sessionState) {
        setError('No active session');
        return;
      }

      if (loadingRef.current) return;

      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        // Ensure the runtime is started and has a session
        const sessionId = await ensureRuntimeSession();
        if (!sessionId) {
          setError('Failed to create session');
          useMessagesStore.getState().addSystemMessage('Error: Failed to create session');
          return;
        }

        const taskId = `task-${Date.now()}`;
        const settings = useUIStore.getState().settings;
        addUserMessage(prompt);

        setTaskState({
          taskId,
          sessionId,
          prompt,
          currentStep: 0,
          maxSteps: settings.maxStepsPerTask,
          isRunning: true,
        });

        const result = await window.coworkIPC.startTask({
          sessionId,
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
