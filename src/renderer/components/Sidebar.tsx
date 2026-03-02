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
    // Cache current messages before navigating away
    const currentSessionId = useSessionStore.getState().sessionState?.sessionId;
    if (currentSessionId && useMessagesStore.getState().messages.length > 0) {
      useMessagesStore.getState().cacheMessages(currentSessionId);
    }
    useSessionStore.getState().setWorkspacePath(null);
    useSessionStore.getState().setSessionState(null);
    useSessionStore.getState().clearLiveSession();
    useMessagesStore.getState().clear();
    setView('home');
  }, [setView]);

  const handleSelectSession = useCallback(
    (workspaceId: string, sessionId: string) => {
      const sessionStore = useSessionStore.getState();
      const msgStore = useMessagesStore.getState();
      const currentSessionId = sessionStore.sessionState?.sessionId;

      // Don't navigate if already viewing this session
      if (currentSessionId === sessionId) {
        setView('conversation');
        return;
      }

      // Cache current messages before navigating away
      if (currentSessionId && msgStore.messages.length > 0) {
        msgStore.cacheMessages(currentSessionId);
      }

      const liveSessionId = sessionStore.liveSessionId;
      const isNavigatingToLive = sessionId === liveSessionId;

      // Update session state
      sessionStore.setSessionState({ sessionId, workspaceId, status: 'ready' });

      if (isNavigatingToLive) {
        // Returning to the live session — restore from cache, keep it live
        sessionStore.setViewingHistory(false);
        if (!msgStore.restoreFromCache(sessionId)) {
          // Cache miss for live session — should not happen, but fall through to WS fetch
          msgStore.clear();
        } else {
          setView('conversation');
          return;
        }
      } else {
        // Historical session — try cache, fall back to WS fetch
        sessionStore.setTaskState(null);
        sessionStore.setViewingHistory(true);
        if (msgStore.restoreFromCache(sessionId)) {
          setView('conversation');
          return;
        }
        msgStore.clear();
      }

      // Cache miss — fetch from Workspace Service
      const fetchHistory = async (): Promise<void> => {
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
            // Cache fetched data for future navigation
            useMessagesStore.getState().cacheMessages(sessionId);
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
      void fetchHistory();
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
