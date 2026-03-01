import { useCallback, useEffect } from 'react';
import { HistoryHeader } from './HistoryHeader';
import { WorkspaceList } from './WorkspaceList';
import { SessionList } from './SessionList';
import { Separator } from '../../components/ui/separator';
import { useHistoryStore } from '../../state/history-store';
import { useUIStore } from '../../state/ui-store';
import { useMessagesStore } from '../../state/messages-store';
import { useSessionStore } from '../../state/session-store';
import type { DisplayMessage } from '../../../shared/types';

export function HistoryView(): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);
  const tenantId = useUIStore((s) => s.settings.tenantId);
  const userId = useUIStore((s) => s.settings.userId);
  const selectedWorkspaceId = useHistoryStore((s) => s.selectedWorkspaceId);
  const setWorkspaces = useHistoryStore((s) => s.setWorkspaces);
  const setSessions = useHistoryStore((s) => s.setSessions);
  const setLoadingWorkspaces = useHistoryStore((s) => s.setLoadingWorkspaces);
  const setLoadingSessions = useHistoryStore((s) => s.setLoadingSessions);
  const setError = useHistoryStore((s) => s.setError);
  const error = useHistoryStore((s) => s.error);

  // Load workspaces on mount
  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoadingWorkspaces(true);
      setError(null);
      try {
        const result = await window.coworkIPC.listWorkspaces({
          tenantId: tenantId ?? 'dev-tenant',
          userId: userId ?? 'dev-user',
        });
        if (result.success) {
          setWorkspaces(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      }
      setLoadingWorkspaces(false);
    };
    void load();
  }, [setWorkspaces, setLoadingWorkspaces, setError, tenantId, userId]);

  // Load sessions when workspace selection changes
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const load = async (): Promise<void> => {
      setLoadingSessions(true);
      setError(null);
      try {
        const result = await window.coworkIPC.listSessions({
          workspaceId: selectedWorkspaceId,
        });
        if (result.success) {
          setSessions(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      }
      setLoadingSessions(false);
    };
    void load();
  }, [selectedWorkspaceId, setSessions, setLoadingSessions, setError]);

  const handleNewChat = useCallback(() => {
    // Pass the selected workspace's localPath so the new session
    // is associated with the same workspace (local-scoped).
    const { selectedWorkspaceId, workspaces } = useHistoryStore.getState();
    const selectedWorkspace = workspaces.find((w) => w.workspaceId === selectedWorkspaceId);
    const localPath = selectedWorkspace?.localPath ?? null;
    useSessionStore.getState().setWorkspacePath(localPath);
    useSessionStore.getState().setSessionState(null);
    useMessagesStore.getState().clear();
    setView('conversation');
  }, [setView]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const workspaceId = useHistoryStore.getState().selectedWorkspaceId;
      if (!workspaceId) return;

      // Load session history then navigate to conversation view
      const load = async (): Promise<void> => {
        try {
          const result = await window.coworkIPC.getSessionHistory({
            workspaceId,
            sessionId,
          });
          if (result.success) {
            // Convert ConversationMessages to DisplayMessages
            const displayMessages: DisplayMessage[] = result.data.map((msg, i) => ({
              id: `history-${i}`,
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              timestamp: msg.timestamp,
            }));
            useMessagesStore.getState().loadHistory(displayMessages);
          }
        } catch {
          // Navigate anyway even if history fails to load
        }
        setView('conversation');
      };
      void load();
    },
    [setView],
  );

  return (
    <div className="flex h-full flex-col">
      <HistoryHeader onNewChat={handleNewChat} />
      {error && (
        <div className="bg-destructive/10 text-destructive border-b px-4 py-2 text-sm">{error}</div>
      )}
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
