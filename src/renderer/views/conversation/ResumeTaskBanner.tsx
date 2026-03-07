import type { IncompleteTask } from '../../../shared/types';
import { Button } from '../../components/ui/button';

interface ResumeTaskBannerProps {
  incompleteTask: IncompleteTask;
  onResume: () => void;
  onDismiss: () => void;
}

export function ResumeTaskBanner({
  incompleteTask,
  onResume,
  onDismiss,
}: ResumeTaskBannerProps): React.JSX.Element {
  return (
    <div
      className="border-border bg-muted/50 mx-4 mb-2 rounded-md border px-4 py-3"
      role="status"
      data-testid="resume-task-banner"
    >
      <div className="text-foreground mb-1 text-sm font-medium">Interrupted task detected</div>
      <div className="text-muted-foreground mb-3 text-sm">
        &ldquo;{incompleteTask.prompt}&rdquo; &mdash; stopped at step {incompleteTask.lastStep}/
        {incompleteTask.maxSteps}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss interrupted task"
        >
          Dismiss
        </Button>
        <Button size="sm" onClick={onResume} aria-label="Resume interrupted task">
          Resume
        </Button>
      </div>
    </div>
  );
}
