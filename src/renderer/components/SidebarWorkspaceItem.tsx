import { cn } from '../lib/utils';
import type { Workspace } from '../../shared/types';

interface SidebarWorkspaceItemProps {
  workspace: Workspace;
  isExpanded: boolean;
  sessionCount?: number;
  onClick: () => void;
}

function getDisplayName(workspace: Workspace): string {
  if (workspace.localPath) {
    const parts = workspace.localPath.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? workspace.localPath;
  }
  try {
    return `Chat ${new Date(workspace.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  } catch {
    return 'Chat';
  }
}

export function SidebarWorkspaceItem({
  workspace,
  isExpanded,
  sessionCount,
  onClick,
}: SidebarWorkspaceItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'hover:bg-accent w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
        isExpanded && 'bg-accent',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-medium">{getDisplayName(workspace)}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {isExpanded ? '\u25BE' : '\u25B8'}
          {sessionCount != null && ` ${sessionCount}`}
        </span>
      </div>
    </button>
  );
}
