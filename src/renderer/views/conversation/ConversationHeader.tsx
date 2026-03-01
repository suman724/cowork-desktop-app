import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { StatusIndicator } from '../../components/StatusIndicator';
import { useSessionStore } from '../../state/session-store';
import { useUIStore } from '../../state/ui-store';

export function ConversationHeader(): React.JSX.Element {
  const agentRuntimeStatus = useSessionStore((s) => s.agentRuntimeStatus);
  const workspacePath = useSessionStore((s) => s.workspacePath);
  const isRunning = useSessionStore((s) => s.taskState?.isRunning ?? false);
  const setView = useUIStore((s) => s.setView);

  const folderName = workspacePath
    ? (workspacePath.split('/').filter(Boolean).pop() ?? workspacePath)
    : null;

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold">{folderName ?? 'Conversation'}</h1>
        {isRunning && (
          <Badge variant="secondary" className="animate-pulse gap-1.5">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Working
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <StatusIndicator status={agentRuntimeStatus} />
        <Button variant="ghost" size="sm" onClick={() => setView('settings')}>
          Settings
        </Button>
      </div>
    </div>
  );
}
