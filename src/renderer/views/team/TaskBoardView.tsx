import { useTeamStore } from '../../state/team-store';
import type { TeamTask } from '../../../shared/types';

const STATUS_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  pending: {
    icon: '○',
    label: 'Pending',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-muted-foreground',
  },
  blocked: {
    icon: '⏸',
    label: 'Blocked',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  in_progress: {
    icon: '▶',
    label: 'In Progress',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
  completed: {
    icon: '✓',
    label: 'Completed',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
  },
  failed: {
    icon: '✗',
    label: 'Failed',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
  },
};

function TaskCard({ task, allTasks }: { task: TeamTask; allTasks: TeamTask[] }): React.JSX.Element {
  const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;

  // Resolve blocked_by task titles
  const blockers =
    task.blocked_by?.map((id) => allTasks.find((t) => t.task_id === id)).filter(Boolean) ?? [];

  return (
    <div className={`rounded-md px-2.5 py-2 ${config.bg}`}>
      {/* Status + Title */}
      <div className="flex items-start gap-1.5">
        <span className={`shrink-0 text-xs ${config.text}`}>{config.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs leading-tight font-medium">{task.title}</div>
          {task.description && (
            <div className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
              {task.description}
            </div>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-4 text-[11px]">
        {/* Status badge */}
        <span className={`font-medium ${config.text}`}>{config.label}</span>

        {/* Assignee */}
        {task.assignee && (
          <span className="rounded bg-blue-100 px-1 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            @{task.assignee}
          </span>
        )}
      </div>

      {/* Blocked by */}
      {blockers.length > 0 && task.status === 'blocked' && (
        <div className="mt-1 pl-4 text-[11px] text-yellow-600 dark:text-yellow-400">
          Waiting on: {blockers.map((b) => b?.title ?? '?').join(', ')}
        </div>
      )}

      {/* Result */}
      {task.result && (
        <div className="mt-1 pl-4 text-[11px] text-green-700 dark:text-green-400">
          {task.result}
        </div>
      )}
    </div>
  );
}

export function TaskBoardView(): React.JSX.Element {
  const tasks = useTeamStore((s) => s.tasks);

  if (tasks.length === 0) {
    return <div className="text-muted-foreground p-3 text-center text-sm">No tasks yet</div>;
  }

  // Group by status for visual scanning
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const blocked = tasks.filter((t) => t.status === 'blocked');
  const pending = tasks.filter((t) => t.status === 'pending');
  const completed = tasks.filter((t) => t.status === 'completed');
  const failed = tasks.filter((t) => t.status === 'failed');

  // Show in priority order: in_progress, blocked, pending, failed, completed
  const ordered = [...inProgress, ...blocked, ...pending, ...failed, ...completed];

  return (
    <div className="space-y-1.5 p-2">
      {ordered.map((task) => (
        <TaskCard key={task.task_id} task={task} allTasks={tasks} />
      ))}
    </div>
  );
}
