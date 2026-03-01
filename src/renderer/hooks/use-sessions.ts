import { useCallback } from 'react';
import type { IpcResponse, SessionSummary } from '../../shared/types';
import { useHistoryStore } from '../state/history-store';

interface UseSessions {
  fetchSessions: (workspaceId: string) => Promise<void>;
}

export function useSessions(): UseSessions {
  const setSessions = useHistoryStore((s) => s.setSessions);
  const setLoadingSessions = useHistoryStore((s) => s.setLoadingSessions);
  const setError = useHistoryStore((s) => s.setError);

  const fetchSessions = useCallback(
    async (workspaceId: string) => {
      setLoadingSessions(true);

      const result: IpcResponse<unknown> = await window.coworkIPC.listSessions({ workspaceId });

      if (result.success) {
        setSessions(result.data as SessionSummary[]);
      } else {
        setError(result.error.message);
      }

      setLoadingSessions(false);
    },
    [setSessions, setLoadingSessions, setError],
  );

  return { fetchSessions };
}
