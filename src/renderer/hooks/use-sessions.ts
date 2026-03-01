import { useCallback } from 'react';
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
      setError(null);

      try {
        const result = await window.coworkIPC.listSessions({ workspaceId });

        if (result.success) {
          setSessions(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoadingSessions(false);
      }
    },
    [setSessions, setLoadingSessions, setError],
  );

  return { fetchSessions };
}
