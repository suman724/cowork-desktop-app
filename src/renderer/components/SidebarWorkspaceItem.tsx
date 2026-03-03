import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import type { Workspace } from '../../shared/types';

interface SidebarWorkspaceItemProps {
  workspace: Workspace;
  isExpanded: boolean;
  sessionCount?: number;
  onClick: () => void;
  onDelete?: (workspaceId: string) => void;
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
  onDelete,
}: SidebarWorkspaceItemProps): React.JSX.Element {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          'group hover:bg-accent flex w-full items-center rounded-md text-left text-sm transition-colors',
          isExpanded && 'bg-accent',
        )}
      >
        <button onClick={onClick} className="min-w-0 flex-1 px-3 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-medium">{getDisplayName(workspace)}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {isExpanded ? '\u25BE' : '\u25B8'}
              {sessionCount != null && ` ${sessionCount}`}
            </span>
          </div>
        </button>
        {onDelete && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'text-muted-foreground hover:text-foreground mr-1 shrink-0 rounded p-1',
                  menuOpen ? 'block' : 'hidden group-hover:block',
                )}
                aria-label="Workspace options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workspace and all its sessions. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.(workspace.workspaceId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
