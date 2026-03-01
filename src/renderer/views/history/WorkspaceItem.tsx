import { cn } from '../../lib/utils';
import type { Workspace } from '../../../shared/types';

interface WorkspaceItemProps {
  workspace: Workspace;
  isSelected: boolean;
  onClick: () => void;
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
      <div className="font-medium">{workspace.localPath ?? workspace.workspaceId}</div>
      <div className="text-muted-foreground text-xs">
        {workspace.workspaceScope} &middot; {workspace.workspaceId.slice(0, 8)}
      </div>
    </button>
  );
}
