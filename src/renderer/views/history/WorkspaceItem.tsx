import { cn } from '../../lib/utils';
import type { Workspace } from '../../../shared/types';

interface WorkspaceItemProps {
  workspace: Workspace;
  isSelected: boolean;
  onClick: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getDisplayName(workspace: Workspace): string {
  if (workspace.localPath) {
    // Show last path component for local workspaces
    const parts = workspace.localPath.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? workspace.localPath;
  }
  // For general workspaces, show date-based name
  return `Chat ${formatDate(workspace.createdAt)}`;
}

export function WorkspaceItem({
  workspace,
  isSelected,
  onClick,
}: WorkspaceItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
        isSelected && 'bg-accent',
      )}
    >
      <div className="truncate font-medium">{getDisplayName(workspace)}</div>
      <div className="text-muted-foreground text-xs">
        {workspace.workspaceScope === 'local'
          ? workspace.localPath
          : formatDate(workspace.lastActiveAt)}
      </div>
    </button>
  );
}
