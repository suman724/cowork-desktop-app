import { useCallback, useEffect } from 'react';
import { HistoryHeader } from './HistoryHeader';
import { WorkspaceList } from './WorkspaceList';
import { SessionList } from './SessionList';
import { Separator } from '../../components/ui/separator';
import { useHistoryStore } from '../../state/history-store';
import { useUIStore } from '../../state/ui-store';

export function HistoryView(): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);
  const selectedWorkspaceId = useHistoryStore((s) => s.selectedWorkspaceId);
  const setWorkspaces = useHistoryStore((s) => s.setWorkspaces);
  const setSessions = useHistoryStore((s) => s.setSessions);
  const setLoadingWorkspaces = useHistoryStore((s) => s.setLoadingWorkspaces);
  const setLoadingSessions = useHistoryStore((s) => s.setLoadingSessions);
  const setError = useHistoryStore((s) => s.setError);

  // Load workspaces on mount
  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoadingWorkspaces(true);
      const result = await window.coworkIPC.listWorkspaces({
        tenantId: 'dev-tenant',
        userId: 'dev-user',
      });
      if (result.success) {
        setWorkspaces(result.data as never);
      } else {
        setError(result.error.message);
      }
      setLoadingWorkspaces(false);
    };
    void load();
  }, [setWorkspaces, setLoadingWorkspaces, setError]);

  // Load sessions when workspace selection changes
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const load = async (): Promise<void> => {
      setLoadingSessions(true);
      const result = await window.coworkIPC.listSessions({ workspaceId: selectedWorkspaceId });
      if (result.success) {
        setSessions(result.data as never);
      } else {
        setError(result.error.message);
      }
      setLoadingSessions(false);
    };
    void load();
  }, [selectedWorkspaceId, setSessions, setLoadingSessions, setError]);

  const handleNewChat = useCallback(() => {
    setView('conversation');
  }, [setView]);

  const handleSelectSession = useCallback(
    (_sessionId: string) => {
      setView('conversation');
    },
    [setView],
  );

  return (
    <div className="flex h-full flex-col">
      <HistoryHeader onNewChat={handleNewChat} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r">
          <WorkspaceList />
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1">
          <SessionList onSelectSession={handleSelectSession} />
        </div>
      </div>
    </div>
  );
}
