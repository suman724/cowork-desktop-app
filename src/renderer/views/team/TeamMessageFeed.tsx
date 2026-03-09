import { useTeamStore } from '../../state/team-store';

export function TeamMessageFeed(): React.JSX.Element {
  const messages = useTeamStore((s) => s.messages);

  if (messages.length === 0) {
    return (
      <div className="text-muted-foreground p-3 text-center text-sm">No team messages yet</div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {messages.map((msg) => (
        <div key={msg.id} className="text-sm">
          <span className="font-medium">@{msg.from}</span>
          <span className="text-muted-foreground"> → @{msg.to}: </span>
          <span>{msg.content}</span>
        </div>
      ))}
    </div>
  );
}
