import { useTeamStore } from '../../state/team-store';

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  blocked: '⏸',
  in_progress: '▶',
  completed: '✓',
  failed: '✗',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-muted-foreground',
  blocked: 'text-yellow-500',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
};

export function TaskBoardView(): React.JSX.Element {
  const tasks = useTeamStore((s) => s.tasks);

  if (tasks.length === 0) {
    return <div className="text-muted-foreground p-3 text-center text-sm">No tasks yet</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {tasks.map((task) => (
        <div
          key={task.task_id}
          className="bg-muted/50 flex items-center gap-2 rounded px-3 py-2 text-sm"
        >
          <span className={STATUS_COLORS[task.status] ?? 'text-muted-foreground'}>
            {STATUS_ICONS[task.status] ?? '?'}
          </span>
          <span className="min-w-0 flex-1 truncate">{task.title}</span>
          {task.assignee && (
            <span className="text-muted-foreground shrink-0 text-xs">@{task.assignee}</span>
          )}
        </div>
      ))}
    </div>
  );
}
