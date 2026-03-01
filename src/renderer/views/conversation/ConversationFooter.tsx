import { Button } from '../../components/ui/button';
import { useSessionStore } from '../../state/session-store';

interface ConversationFooterProps {
  onCancel: () => void;
}

export function ConversationFooter({ onCancel }: ConversationFooterProps): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);

  if (!taskState) return <></>;

  return (
    <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-1.5 text-xs">
      <span>
        Step {taskState.currentStep}/{taskState.maxSteps}
      </span>
      {taskState.isRunning && (
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}
