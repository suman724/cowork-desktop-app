import { ScrollArea } from '../../components/ui/scroll-area';
import { useHistoryStore } from '../../state/history-store';
import { SessionItem } from './SessionItem';

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ onSelectSession }: SessionListProps): React.JSX.Element {
  const sessions = useHistoryStore((s) => s.sessions);
  const selectedWorkspaceId = useHistoryStore((s) => s.selectedWorkspaceId);
  const isLoading = useHistoryStore((s) => s.isLoadingSessions);

  if (!selectedWorkspaceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Select a workspace to view sessions</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {isLoading ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">No sessions</p>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.sessionId}
              session={session}
              onClick={() => onSelectSession(session.sessionId)}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
