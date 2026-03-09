import { useEffect, useRef } from 'react';
import { useTeamStore } from '../../state/team-store';
import type { TeamMember } from '../../../shared/types';

interface TeammatePanelProps {
  member: TeamMember;
}

export function TeammatePanel({ member }: TeammatePanelProps): React.JSX.Element {
  const output = useTeamStore((s) => s.teammateOutput[member.name] ?? '');
  const toolActivity = useTeamStore((s) => s.teammateTools[member.name]);
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

  return (
    <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
      <div className="bg-muted flex items-center gap-2 border-b px-3 py-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            member.status === 'running' ? 'bg-green-500' : 'bg-muted-foreground'
          }`}
        />
        <span className="text-sm font-medium">{member.name}</span>
        <span className="text-muted-foreground text-xs">{member.role}</span>
        {isToolActive && (
          <span className="ml-auto flex items-center gap-1 text-xs text-blue-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            {toolActivity.toolName}
          </span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {output ? (
          <div className="text-foreground prose prose-sm max-w-none text-sm whitespace-pre-wrap">
            {output}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm italic">Waiting for output...</p>
        )}
      </div>
    </div>
  );
}
