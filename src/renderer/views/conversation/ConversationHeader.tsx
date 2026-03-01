import { Button } from '../../components/ui/button';
import { StatusIndicator } from '../../components/StatusIndicator';
import { useSessionStore } from '../../state/session-store';
import { useUIStore } from '../../state/ui-store';

export function ConversationHeader(): React.JSX.Element {
  const agentRuntimeStatus = useSessionStore((s) => s.agentRuntimeStatus);
  const setView = useUIStore((s) => s.setView);

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setView('history')}>
          Back
        </Button>
        <h1 className="text-sm font-semibold">Conversation</h1>
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
