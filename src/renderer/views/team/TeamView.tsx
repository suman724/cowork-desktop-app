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
    <div className="border-border flex h-full flex-col border-t">
      {/* Header */}
      <div className="bg-muted flex items-center gap-2 border-b px-4 py-2">
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
        <div className="border-border w-72 shrink-0 overflow-y-auto border-l">
          <div className="border-b px-3 py-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Tasks</span>
          </div>
          <TaskBoardView />

          <div className="border-t border-b px-3 py-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Messages</span>
          </div>
          <TeamMessageFeed />
        </div>
      </div>
    </div>
  );
}
