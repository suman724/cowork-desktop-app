import { cn } from '../lib/utils';
import type { AgentRuntimeStatus } from '../../shared/types';

interface StatusIndicatorProps {
  status: AgentRuntimeStatus;
  className?: string;
}

const STATUS_COLORS: Record<AgentRuntimeStatus, string> = {
  stopped: 'bg-muted-foreground',
  starting: 'bg-yellow-500 animate-pulse',
  running: 'bg-green-500',
  crashed: 'bg-red-500',
};

const STATUS_LABELS: Record<AgentRuntimeStatus, string> = {
  stopped: 'Stopped',
  starting: 'Starting...',
  running: 'Running',
  crashed: 'Crashed',
};

export function StatusIndicator({ status, className }: StatusIndicatorProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[status])} />
      <span className="text-muted-foreground text-xs">{STATUS_LABELS[status]}</span>
    </div>
  );
}
