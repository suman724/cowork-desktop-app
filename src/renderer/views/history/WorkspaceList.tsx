import { ScrollArea } from '../../components/ui/scroll-area';
import { useHistoryStore } from '../../state/history-store';
import { WorkspaceItem } from './WorkspaceItem';

export function WorkspaceList(): React.JSX.Element {
  const workspaces = useHistoryStore((s) => s.workspaces);
  const selectedWorkspaceId = useHistoryStore((s) => s.selectedWorkspaceId);
  const setSelectedWorkspaceId = useHistoryStore((s) => s.setSelectedWorkspaceId);
  const isLoading = useHistoryStore((s) => s.isLoadingWorkspaces);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {isLoading ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">Loading...</p>
        ) : workspaces.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-center text-sm">No workspaces</p>
        ) : (
          workspaces.map((ws) => (
            <WorkspaceItem
              key={ws.workspaceId}
              workspace={ws}
              isSelected={ws.workspaceId === selectedWorkspaceId}
              onClick={() => setSelectedWorkspaceId(ws.workspaceId)}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
