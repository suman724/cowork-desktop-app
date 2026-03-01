import { useState, useCallback, useRef } from 'react';
// IPC types are inferred from window.coworkIPC
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
  const loadingRef = useRef(false);
  const resolveCurrentApproval = useApprovalStore((s) => s.resolveCurrentApproval);

  const resolve = useCallback(
    async (decision: 'approved' | 'denied', reason?: string) => {
      const currentApproval = useApprovalStore.getState().currentApproval;
      if (!currentApproval || loadingRef.current) return;

      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await window.coworkIPC.resolveApproval({
          approvalId: currentApproval.approvalId,
          decision,
          reason,
        });

        if (result.success) {
          resolveCurrentApproval();
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [resolveCurrentApproval],
  );

  const approve = useCallback((reason?: string) => resolve('approved', reason), [resolve]);

  const deny = useCallback((reason?: string) => resolve('denied', reason), [resolve]);

  return { approve, deny, isLoading, error };
}
