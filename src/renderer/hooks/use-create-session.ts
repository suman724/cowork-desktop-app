import { useState, useCallback } from 'react';
import type { IpcResponse, SessionState } from '../../shared/types';
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';
import { useUIStore } from '../state/ui-store';

interface UseCreateSession {
  createSession: (params: {
    tenantId: string;
    userId: string;
    workspaceHint?: { scope: string; localPath?: string };
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
      workspaceHint?: { scope: string; localPath?: string };
    }) => {
      setIsLoading(true);
      setError(null);

      const result: IpcResponse<unknown> = await window.coworkIPC.createSession(params);

      if (result.success) {
        const sessionState = result.data as SessionState;
        setSessionState(sessionState);
        clearMessages();
        setView('conversation');
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    },
    [setSessionState, clearMessages, setView],
  );

  return { createSession, isLoading, error };
}
