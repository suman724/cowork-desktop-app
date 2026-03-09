import { useEffect, useRef } from 'react';
import { useTeamStore } from '../../state/team-store';
import { MarkdownRenderer } from '../conversation/MarkdownRenderer';
import type { TeamMember } from '../../../shared/types';

interface TeammatePanelProps {
  member: TeamMember;
}

export function TeammatePanel({ member }: TeammatePanelProps): React.JSX.Element {
  const output = useTeamStore((s) => s.teammateOutput[member.name] ?? '');
  const toolActivity = useTeamStore((s) => s.teammateTools[member.name]);
  const tasks = useTeamStore((s) => s.tasks);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  // Show tool activity if it's recent (within 10s) and in-progress
  const isToolActive =
    toolActivity &&
    toolActivity.status === 'requested' &&
    Date.now() - toolActivity.timestamp < 10_000;

  // Tasks assigned to this teammate
  const myTasks = tasks.filter((t) => t.assignee === member.name);

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
      {/* Header */}
      <div className="bg-muted flex items-center gap-2 border-b px-3 py-2">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${
            member.status === 'running' ? 'bg-green-500' : 'bg-muted-foreground'
          }`}
        />
        <span className="text-sm font-medium">{member.name}</span>
        <span className="text-muted-foreground truncate text-xs">{member.role}</span>
        {isToolActive && (
          <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-blue-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            {toolActivity.toolName}
          </span>
        )}
      </div>

      {/* Task badges */}
      {myTasks.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b px-3 py-1.5">
          {myTasks.map((t) => (
            <span
              key={t.task_id}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                t.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : t.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : t.status === 'failed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-muted text-muted-foreground'
              }`}
            >
              {t.status === 'completed' && '✓'}
              {t.status === 'in_progress' && '▶'}
              {t.status === 'failed' && '✗'}
              {t.status === 'pending' && '○'}
              {t.title}
            </span>
          ))}
        </div>
      )}

      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {output ? (
          <MarkdownRenderer content={output} />
        ) : (
          <p className="text-muted-foreground text-sm italic">Waiting for output...</p>
        )}
      </div>
    </div>
  );
}
