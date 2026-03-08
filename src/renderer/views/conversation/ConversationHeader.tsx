import { Settings } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { StatusIndicator } from '../../components/StatusIndicator';
import { useSessionStore } from '../../state/session-store';
import { useUIStore } from '../../state/ui-store';

export function ConversationHeader(): React.JSX.Element {
  const agentRuntimeStatus = useSessionStore((s) => s.agentRuntimeStatus);
  const workspacePath = useSessionStore((s) => s.workspacePath);
  const sessionName = useSessionStore((s) => s.sessionState?.name);
  const isRunning = useSessionStore((s) => s.taskState?.isRunning ?? false);
  const planMode = useSessionStore((s) => s.planMode);
  const isVerifying = useSessionStore((s) => s.isVerifying);
  const setView = useUIStore((s) => s.setView);

  const folderName = workspacePath
    ? (workspacePath.split('/').filter(Boolean).pop() ?? workspacePath)
    : null;

  const title = sessionName || folderName || 'Conversation';

  return (
    <div className="flex items-center justify-between border-b px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {isRunning && !planMode && !isVerifying && (
          <Badge variant="secondary" className="animate-pulse gap-1.5">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Working
          </Badge>
        )}
        {isRunning && planMode && (
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Planning
          </Badge>
        )}
        {isRunning && isVerifying && (
          <Badge variant="outline" className="animate-pulse gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Verifying
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <StatusIndicator status={agentRuntimeStatus} />
        <Button variant="ghost" size="sm" onClick={() => setView('settings')}>
          <Settings className="mr-1.5 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
