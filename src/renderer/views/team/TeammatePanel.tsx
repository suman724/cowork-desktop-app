import { useTeamStore } from '../../state/team-store';
import type { TeamMember } from '../../../shared/types';

interface TeammatePanelProps {
  member: TeamMember;
}

export function TeammatePanel({ member }: TeammatePanelProps): React.JSX.Element {
  const output = useTeamStore((s) => s.teammateOutput[member.name] ?? '');

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
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {output ? (
          <pre className="text-foreground text-sm whitespace-pre-wrap">{output}</pre>
        ) : (
          <p className="text-muted-foreground text-sm italic">Waiting for output...</p>
        )}
      </div>
    </div>
  );
}
