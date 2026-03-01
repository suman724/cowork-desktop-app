import { useEffect } from 'react';
import { useSessionStore } from '../state/session-store';
import type { AgentRuntimeStatus } from '../../shared/types';

/**
 * Hook that listens for agent runtime status changes and crash events.
 */
export function useAgentRuntimeEvents(): void {
  const setAgentRuntimeStatus = useSessionStore((s) => s.setAgentRuntimeStatus);
  const setError = useSessionStore((s) => s.setError);

  useEffect(() => {
    const cleanupStatus = window.coworkIPC.onRuntimeStatusChanged((status: AgentRuntimeStatus) => {
      setAgentRuntimeStatus(status);
    });

    const cleanupCrash = window.coworkIPC.onRuntimeCrashed(
      (info: { code: number | null; signal: string | null }) => {
        setAgentRuntimeStatus('crashed');
        setError(
          `Agent runtime crashed (code: ${String(info.code)}, signal: ${String(info.signal)})`,
        );
      },
    );

    return () => {
      cleanupStatus();
      cleanupCrash();
    };
  }, [setAgentRuntimeStatus, setError]);
}
