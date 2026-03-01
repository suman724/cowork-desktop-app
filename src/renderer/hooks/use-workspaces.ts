import { useCallback } from 'react';
import { useHistoryStore } from '../state/history-store';

interface UseWorkspaces {
  fetchWorkspaces: (tenantId: string, userId: string) => Promise<void>;
}

export function useWorkspaces(): UseWorkspaces {
  const setWorkspaces = useHistoryStore((s) => s.setWorkspaces);
  const setLoadingWorkspaces = useHistoryStore((s) => s.setLoadingWorkspaces);
  const setError = useHistoryStore((s) => s.setError);

  const fetchWorkspaces = useCallback(
    async (tenantId: string, userId: string) => {
      setLoadingWorkspaces(true);
      setError(null);

      try {
        const result = await window.coworkIPC.listWorkspaces({ tenantId, userId });

        if (result.success) {
          setWorkspaces(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      } finally {
        setLoadingWorkspaces(false);
      }
    },
    [setWorkspaces, setLoadingWorkspaces, setError],
  );

  return { fetchWorkspaces };
}
