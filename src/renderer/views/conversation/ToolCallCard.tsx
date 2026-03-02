import { Badge } from '../../components/ui/badge';
import type { ToolCallInfo } from '../../../shared/types';

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

const STATUS_VARIANT: Record<
  ToolCallInfo['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  running: 'secondary',
  completed: 'default',
  failed: 'destructive',
  denied: 'destructive',
};

const STATUS_LABEL: Record<ToolCallInfo['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  denied: 'Denied',
};

export function ToolCallCard({ toolCall }: ToolCallCardProps): React.JSX.Element {
  return (
    <div className="bg-card rounded-md border p-2.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-medium">{toolCall.toolName}</span>
        <Badge variant={STATUS_VARIANT[toolCall.status]} className="text-[10px]">
          {STATUS_LABEL[toolCall.status]}
        </Badge>
      </div>

      {toolCall.error && <p className="text-destructive mt-1 text-xs">{toolCall.error}</p>}

      {toolCall.result && toolCall.status === 'completed' && (
        <pre className="bg-muted text-muted-foreground mt-1 max-h-24 overflow-auto rounded p-1.5 text-[11px]">
          {toolCall.result.slice(0, 500)}
        </pre>
      )}
    </div>
  );
}
