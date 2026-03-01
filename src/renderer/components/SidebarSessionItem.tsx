import { Badge } from './ui/badge';
import type { SessionSummary } from '../../shared/types';

interface SidebarSessionItemProps {
  session: SessionSummary;
  onClick: () => void;
}

export function SidebarSessionItem({
  session,
  onClick,
}: SidebarSessionItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="hover:bg-accent w-full rounded-md px-3 py-1 text-left text-xs transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="truncate">{session.sessionId.slice(0, 12)}</span>
        <Badge variant="outline" className="ml-1 shrink-0 text-[10px]">
          {session.taskCount}
        </Badge>
      </div>
    </button>
  );
}
