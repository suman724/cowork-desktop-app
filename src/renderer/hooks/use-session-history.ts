import { useState, useCallback } from 'react';
import type { DisplayMessage } from '../../shared/types';
import { useMessagesStore } from '../state/messages-store';

interface UseSessionHistory {
  fetchHistory: (workspaceId: string, sessionId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useSessionHistory(): UseSessionHistory {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadHistory = useMessagesStore((s) => s.loadHistory);

  const fetchHistory = useCallback(
    async (workspaceId: string, sessionId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await window.coworkIPC.getSessionHistory({
          workspaceId,
          sessionId,
        });

        if (result.success) {
          const displayMessages: DisplayMessage[] = result.data.map((msg, i) => ({
            id: `history-${String(i)}`,
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            timestamp: msg.timestamp,
          }));
          loadHistory(displayMessages);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    },
    [loadHistory],
  );

  return { fetchHistory, isLoading, error };
}
