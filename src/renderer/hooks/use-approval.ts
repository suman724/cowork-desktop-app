import { useState, useCallback } from 'react';
import type { IpcResponse } from '../../shared/types';
import { useApprovalStore } from '../state/approval-store';

interface UseApproval {
  approve: (reason?: string) => Promise<void>;
  deny: (reason?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useApproval(): UseApproval {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentApproval = useApprovalStore((s) => s.currentApproval);
  const resolveCurrentApproval = useApprovalStore((s) => s.resolveCurrentApproval);

  const resolve = useCallback(
    async (decision: 'approved' | 'denied', reason?: string) => {
      if (!currentApproval) return;

      setIsLoading(true);
      setError(null);

      const result: IpcResponse<unknown> = await window.coworkIPC.resolveApproval({
        approvalId: currentApproval.approvalId,
        decision,
        reason,
      });

      if (result.success) {
        resolveCurrentApproval();
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    },
    [currentApproval, resolveCurrentApproval],
  );

  const approve = useCallback((reason?: string) => resolve('approved', reason), [resolve]);

  const deny = useCallback((reason?: string) => resolve('denied', reason), [resolve]);

  return { approve, deny, isLoading, error };
}
