import { useEffect, useRef } from 'react';
import { useTeamStore } from '../../state/team-store';

export function TeamMessageFeed(): React.JSX.Element {
  const messages = useTeamStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="text-muted-foreground p-3 text-center text-sm">No team messages yet</div>
    );
  }

  return (
    <div ref={scrollRef} className="space-y-2 p-2">
      {messages.map((msg) => (
        <div key={msg.id} className="bg-muted/50 rounded px-2.5 py-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-blue-600 dark:text-blue-400">@{msg.from}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">@{msg.to}</span>
          </div>
          <p className="mt-1 leading-relaxed">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
