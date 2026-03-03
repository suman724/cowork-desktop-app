import { Button } from '../../components/ui/button';
import { useSessionStore } from '../../state/session-store';

interface ConversationFooterProps {
  onCancel: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
}

export function ConversationFooter({
  onCancel,
  onRetry,
  canRetry,
}: ConversationFooterProps): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);

  if (!taskState) return <></>;

  const progress =
    taskState.maxSteps > 0 ? Math.round((taskState.currentStep / taskState.maxSteps) * 100) : 0;

  return (
    <div className="border-t">
      {taskState.isRunning && (
        <div className="bg-muted h-1 w-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-500 ease-out"
            style={{ width: `${String(progress)}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
      <div className="text-muted-foreground flex items-center justify-between px-4 py-1.5 text-xs">
        <span>
          Step {taskState.currentStep}/{taskState.maxSteps}
          {taskState.isRunning && ` · ${String(progress)}%`}
        </span>
        {taskState.isRunning && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={onCancel}
            aria-label="Cancel current task"
          >
            Cancel
          </Button>
        )}
        {!taskState.isRunning && canRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={onRetry}
            aria-label="Retry failed task"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
