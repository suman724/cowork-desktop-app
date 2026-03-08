import { useEffect, useCallback, useState, useRef } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
  const error = useHistoryStore((s) => s.error);
  const setError = useHistoryStore((s) => s.setError);
  const removeWorkspace = useHistoryStore((s) => s.removeWorkspace);
  const removeSession = useHistoryStore((s) => s.removeSession);

  // Re-fetch workspaces when a new session is created (sessionState changes)
  const sessionState = useSessionStore((s) => s.sessionState);

  // Track which workspace is expanded and its loaded sessions
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Manual retry counter to trigger re-fetch
  const [retryCount, setRetryCount] = useState(0);

  // Abort controller for cancelling in-flight workspace fetch
  const abortRef = useRef<AbortController | null>(null);

  // Load workspaces on mount and when sessionState changes (new session created)
  useEffect(() => {
    // Cancel any in-flight fetch from a previous effect invocation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const load = async (): Promise<void> => {
      setLoadingWorkspaces(true);
      setError(null);
      try {
        const result = await window.coworkIPC.listWorkspaces({
          tenantId: tenantId ?? 'dev-tenant',
          userId: userId ?? 'dev-user',
        });
        if (controller.signal.aborted) return;
        if (result.success) {
          setWorkspaces(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      }
      setLoadingWorkspaces(false);
    };
    void load();

    return () => controller.abort();
  }, [setWorkspaces, setLoadingWorkspaces, setError, tenantId, userId, sessionState, retryCount]);

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
        // Set workspace path from the workspace's localPath so the agent runtime
        // knows the working directory for this session's tools and LLM context.
        const ws = workspaces.find((w) => w.workspaceId === workspaceId);
        useSessionStore.getState().setWorkspacePath(ws?.localPath ?? null);

        // Always fetch the latest messages from the Workspace Service.
        // The agent-runtime uploads session history after each task completes,
        // so the server has the authoritative conversation state.
        const sessionSummary = sessions.find((s) => s.sessionId === sessionId);
        useSessionStore.getState().setSessionState({
          sessionId,
          workspaceId,
          status: 'ready',
          name: sessionSummary?.name,
        });
        useSessionStore.getState().setTaskState(null);
        useSessionStore.getState().clearPlanState();
        useSessionStore.getState().setViewingHistory(true);
        useMessagesStore.getState().clear();

        try {
          const result = await window.coworkIPC.getSessionHistory({
            workspaceId,
            sessionId,
          });
          if (result.success && result.data.length > 0) {
            console.debug(
              '[Sidebar] Session history loaded:',
              result.data.length,
              'messages, roles:',
              result.data.map((m) => m.role),
            );
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
    [setView, workspaces],
  );

  const handleDeleteWorkspace = useCallback(
    (workspaceId: string) => {
      const doDelete = async (): Promise<void> => {
        try {
          const result = await window.coworkIPC.deleteWorkspace({ workspaceId });
          if (result.success) {
            removeWorkspace(workspaceId);
            if (expandedWorkspaceId === workspaceId) {
              setExpandedWorkspaceId(null);
              setSessions([]);
            }
          } else {
            console.error('[Sidebar] Failed to delete workspace:', result.error.message);
          }
        } catch (err) {
          console.error('[Sidebar] Error deleting workspace:', err);
        }
      };
      void doDelete();
    },
    [removeWorkspace, expandedWorkspaceId],
  );

  const handleDeleteSession = useCallback(
    (workspaceId: string, sessionId: string) => {
      const doDelete = async (): Promise<void> => {
        try {
          const result = await window.coworkIPC.deleteSession({ workspaceId, sessionId });
          if (result.success) {
            removeSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
          } else {
            console.error('[Sidebar] Failed to delete session:', result.error.message);
          }
        } catch (err) {
          console.error('[Sidebar] Error deleting session:', err);
        }
      };
      void doDelete();
    },
    [removeSession],
  );

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r" data-testid="sidebar">
      <div className="border-b px-3 py-2">
        <Button size="sm" className="w-full" onClick={handleNewChat} data-testid="new-chat-button">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {isLoadingWorkspaces ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">Loading...</p>
          ) : error ? (
            <div className="px-3 py-4 text-center">
              <p className="text-muted-foreground text-xs">Could not load workspaces</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setRetryCount((c) => c + 1)}
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">No workspaces</p>
          ) : (
            workspaces.map((ws) => (
              <div key={ws.workspaceId}>
                <SidebarWorkspaceItem
                  workspace={ws}
                  isExpanded={ws.workspaceId === expandedWorkspaceId}
                  onClick={() => handleToggleWorkspace(ws.workspaceId)}
                  onDelete={handleDeleteWorkspace}
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
                          onDelete={(sessionId) => handleDeleteSession(ws.workspaceId, sessionId)}
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
