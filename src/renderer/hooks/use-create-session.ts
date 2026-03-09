import { useState, useCallback } from 'react';
import type { SessionState } from '../../shared/types';
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';
import { useTeamStore } from '../state/team-store';
import { useUIStore } from '../state/ui-store';

interface UseCreateSession {
  createSession: (params: {
    tenantId: string;
    userId: string;
    workspaceHint?: { localPaths?: string[]; workspaceId?: string };
  }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useCreateSession(): UseCreateSession {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSessionState = useSessionStore((s) => s.setSessionState);
  const clearMessages = useMessagesStore((s) => s.clear);
  const setView = useUIStore((s) => s.setView);

  const createSession = useCallback(
    async (params: {
      tenantId: string;
      userId: string;
      workspaceHint?: { localPaths?: string[]; workspaceId?: string };
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await window.coworkIPC.createSession(params);

        if (result.success) {
          const sessionState: SessionState = result.data;
          setSessionState(sessionState);
          clearMessages();
          useTeamStore.getState().clearTeam();
          setView('conversation');

          // Check for incomplete task from crash recovery
          const stateResult = await window.coworkIPC.getSessionState({
            sessionId: sessionState.sessionId,
          });
          if (stateResult.success && stateResult.data.incompleteTask) {
            useSessionStore.getState().setIncompleteTask(stateResult.data.incompleteTask);
          }
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [setSessionState, clearMessages, setView],
  );

  return { createSession, isLoading, error };
}
