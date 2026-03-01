import { useState, useCallback } from 'react';
import type { IpcResponse, DisplayMessage, ConversationMessage } from '../../shared/types';
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

      const result: IpcResponse<unknown> = await window.coworkIPC.getSessionHistory({
        workspaceId,
        sessionId,
      });

      if (result.success) {
        const messages = result.data as ConversationMessage[];
        const displayMessages: DisplayMessage[] = messages.map((msg) => ({
          id: msg.messageId,
          role: msg.role as DisplayMessage['role'],
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        loadHistory(displayMessages);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    },
    [loadHistory],
  );

  return { fetchHistory, isLoading, error };
}
