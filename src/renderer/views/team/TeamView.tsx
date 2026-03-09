import { useTeamStore } from '../../state/team-store';
import { TeammatePanel } from './TeammatePanel';
import { TaskBoardView } from './TaskBoardView';
import { TeamMessageFeed } from './TeamMessageFeed';

/**
 * TeamView — multi-panel container showing team activity.
 *
 * Layout: left side has teammate panels stacked vertically,
 * right side has task board + message feed.
 */
export function TeamView(): React.JSX.Element {
  const team = useTeamStore((s) => s.team);
  const members = useTeamStore((s) => s.members);

  if (!team) {
    return <></>;
  }

  const activeMembers = members.filter((m) => m.status === 'running');

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className="bg-muted flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-semibold">{team.name}</span>
        <span className="text-muted-foreground text-xs">
          {activeMembers.length} teammate{activeMembers.length !== 1 ? 's' : ''} active
        </span>
      </div>

      {/* Body: teammate panels + sidebar */}
      <div className="flex min-h-0 flex-1">
        {/* Teammate panels */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
          {members.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              No teammates spawned yet
            </div>
          ) : (
            members.map((m) => <TeammatePanel key={m.name} member={m} />)
          )}
        </div>

        {/* Right sidebar: tasks + messages */}
        <div className="border-border flex w-56 shrink-0 flex-col overflow-hidden border-l">
          <div className="shrink-0 border-b px-3 py-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Tasks</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TaskBoardView />
          </div>

          <div className="shrink-0 border-t border-b px-3 py-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Messages</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TeamMessageFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
