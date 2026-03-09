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
    <div className="space-y-1.5 p-2">
      {tasks.map((task) => (
        <div key={task.task_id} className="bg-muted/50 rounded px-2.5 py-2 text-xs">
          <div className="flex items-start gap-1.5">
            <span className={`shrink-0 ${STATUS_COLORS[task.status] ?? 'text-muted-foreground'}`}>
              {STATUS_ICONS[task.status] ?? '?'}
            </span>
            <span className="leading-tight font-medium">{task.title}</span>
          </div>
          {task.assignee && <div className="text-muted-foreground mt-1 pl-4">@{task.assignee}</div>}
          {task.result && (
            <div className="mt-1 pl-4 text-green-600 dark:text-green-400">{task.result}</div>
          )}
        </div>
      ))}
    </div>
  );
}
