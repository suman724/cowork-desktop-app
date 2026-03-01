import { Badge } from '../../components/ui/badge';
import type { SessionSummary } from '../../../shared/types';

interface SessionItemProps {
  session: SessionSummary;
  onClick: () => void;
}

export function SessionItem({ session, onClick }: SessionItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="truncate font-medium">
          {session.firstPrompt ?? session.sessionId.slice(0, 12)}
        </span>
        <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
          {session.status}
        </Badge>
      </div>
      <div className="text-muted-foreground mt-0.5 text-xs">
        {new Date(session.createdAt).toLocaleDateString()} &middot; {session.messageCount} messages
      </div>
    </button>
  );
}
