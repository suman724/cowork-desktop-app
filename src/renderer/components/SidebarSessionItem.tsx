import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
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
import type { SessionSummary } from '../../shared/types';

interface SidebarSessionItemProps {
  session: SessionSummary;
  onClick: () => void;
  onDelete?: (sessionId: string) => void;
}

export function SidebarSessionItem({
  session,
  onClick,
  onDelete,
}: SidebarSessionItemProps): React.JSX.Element {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="group hover:bg-accent flex w-full items-center rounded-md text-left text-xs transition-colors">
        <button onClick={onClick} className="min-w-0 flex-1 px-3 py-1">
          <div className="flex items-center justify-between">
            <span className="truncate">{session.name || session.sessionId.slice(0, 12)}</span>
            <Badge variant="outline" className="ml-1 shrink-0 text-[10px]">
              {session.taskCount}
            </Badge>
          </div>
        </button>
        {onDelete && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'text-muted-foreground hover:text-foreground mr-1 shrink-0 rounded p-0.5',
                  menuOpen ? 'block' : 'hidden group-hover:block',
                )}
                aria-label="Session options"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session&apos;s conversation history. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.(session.sessionId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
