import { useEffect, useCallback, useState } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { SidebarWorkspaceItem } from './SidebarWorkspaceItem';
import { SidebarSessionItem } from './SidebarSessionItem';
import { useHistoryStore } from '../state/history-store';
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';
import { useUIStore } from '../state/ui-store';
import type { DisplayMessage, SessionSummary } from '../../shared/types';

export function Sidebar(): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);
  const tenantId = useUIStore((s) => s.settings.tenantId);
  const userId = useUIStore((s) => s.settings.userId);
  const workspaces = useHistoryStore((s) => s.workspaces);
  const setWorkspaces = useHistoryStore((s) => s.setWorkspaces);
  const isLoadingWorkspaces = useHistoryStore((s) => s.isLoadingWorkspaces);
  const setLoadingWorkspaces = useHistoryStore((s) => s.setLoadingWorkspaces);
  const setError = useHistoryStore((s) => s.setError);

  // Re-fetch workspaces when a new session is created (sessionState changes)
  const sessionState = useSessionStore((s) => s.sessionState);

  // Track which workspace is expanded and its loaded sessions
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Load workspaces on mount and when sessionState changes (new session created)
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
  }, [setWorkspaces, setLoadingWorkspaces, setError, tenantId, userId, sessionState]);

  // Load sessions when a workspace is expanded, and re-fetch when sessionState changes
  useEffect(() => {
    if (!expandedWorkspaceId) {
      setSessions([]);
      return;
    }

    const load = async (): Promise<void> => {
      setIsLoadingSessions(true);
      try {
        const result = await window.coworkIPC.listSessions({
          workspaceId: expandedWorkspaceId,
        });
        if (result.success) {
          setSessions(result.data);
        }
      } catch {
        // Silently fail — sidebar is supplementary
      }
      setIsLoadingSessions(false);
    };
    void load();
  }, [expandedWorkspaceId, sessionState]);

  const handleToggleWorkspace = useCallback((workspaceId: string) => {
    setExpandedWorkspaceId((prev) => (prev === workspaceId ? null : workspaceId));
  }, []);

  const handleNewChat = useCallback(() => {
    useSessionStore.getState().setWorkspacePath(null);
    useSessionStore.getState().setSessionState(null);
    useMessagesStore.getState().clear();
    setView('home');
  }, [setView]);

  const handleSelectSession = useCallback(
    (workspaceId: string, sessionId: string) => {
      const load = async (): Promise<void> => {
        // Set session context so ConversationView knows which session is active
        useSessionStore.getState().setSessionState({
          sessionId,
          workspaceId,
          status: 'ready',
        });
        // Clear task state — this is a historical session, not a running task
        useSessionStore.getState().setTaskState(null);
        // Clear previous messages before loading history
        useMessagesStore.getState().clear();

        try {
          const result = await window.coworkIPC.getSessionHistory({
            workspaceId,
            sessionId,
          });
          if (result.success && result.data.length > 0) {
            const displayMessages: DisplayMessage[] = result.data.map((msg, i) => ({
              id: `history-${i}`,
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              timestamp: msg.timestamp,
            }));
            useMessagesStore.getState().loadHistory(displayMessages);
          } else if (!result.success) {
            console.error('[Sidebar] Failed to load session history:', result.error.message);
            useMessagesStore.getState().addSystemMessage('Failed to load conversation history.');
          }
        } catch (err) {
          console.error('[Sidebar] Error loading session history:', err);
          useMessagesStore.getState().addSystemMessage('Failed to load conversation history.');
        }
        setView('conversation');
      };
      void load();
    },
    [setView],
  );

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r" data-testid="sidebar">
      <div className="border-b px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleNewChat}
          data-testid="new-chat-button"
        >
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {isLoadingWorkspaces ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">Loading...</p>
          ) : workspaces.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">No workspaces</p>
          ) : (
            workspaces.map((ws) => (
              <div key={ws.workspaceId}>
                <SidebarWorkspaceItem
                  workspace={ws}
                  isExpanded={ws.workspaceId === expandedWorkspaceId}
                  onClick={() => handleToggleWorkspace(ws.workspaceId)}
                />
                {ws.workspaceId === expandedWorkspaceId && (
                  <div className="mt-0.5 ml-3 space-y-0.5 border-l pl-2">
                    {isLoadingSessions ? (
                      <p className="text-muted-foreground px-2 py-1 text-xs">Loading...</p>
                    ) : sessions.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-1 text-xs">No sessions</p>
                    ) : (
                      sessions.map((session) => (
                        <SidebarSessionItem
                          key={session.sessionId}
                          session={session}
                          onClick={() => handleSelectSession(ws.workspaceId, session.sessionId)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
