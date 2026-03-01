import { useCallback } from 'react';
import type { IpcResponse, Workspace } from '../../shared/types';
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

      const result: IpcResponse<unknown> = await window.coworkIPC.listWorkspaces({
        tenantId,
        userId,
      });

      if (result.success) {
        setWorkspaces(result.data as Workspace[]);
      } else {
        setError(result.error.message);
      }

      setLoadingWorkspaces(false);
    },
    [setWorkspaces, setLoadingWorkspaces, setError],
  );

  return { fetchWorkspaces };
}
