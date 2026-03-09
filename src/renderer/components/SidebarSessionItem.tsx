import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useHistoryStore } from '../state/history-store';
import { useSessionStore } from '../state/session-store';
import type { SessionSummary } from '../../shared/types';

const MAX_SESSION_NAME_LENGTH = 200;

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
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameSession = useHistoryStore((s) => s.renameSession);
  const updateSessionName = useSessionStore((s) => s.updateSessionName);
  const activeSessionId = useSessionStore((s) => s.sessionState?.sessionId);

  useEffect(() => {
    if (showRenameDialog) {
      setRenameValue(session.name ?? '');
      setRenameError(null);
    }
  }, [showRenameDialog, session.name]);

  const handleRenameSubmit = async (): Promise<void> => {
    const trimmed = renameValue.trim();
    if (trimmed.length === 0) {
      setRenameError('Name cannot be empty');
      return;
    }
    if (trimmed.length > MAX_SESSION_NAME_LENGTH) {
      setRenameError(`Name must be ${MAX_SESSION_NAME_LENGTH} characters or less`);
      return;
    }

    setIsRenaming(true);
    setRenameError(null);
    try {
      const result = await window.coworkIPC.updateSessionName({
        sessionId: session.sessionId,
        name: trimmed,
      });
      if (result.success) {
        renameSession(session.sessionId, trimmed);
        if (session.sessionId === activeSessionId) {
          updateSessionName(trimmed);
        }
        setShowRenameDialog(false);
      } else {
        setRenameError(result.error.message);
      }
    } catch {
      setRenameError('Failed to rename session');
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group hover:bg-accent flex w-full items-center rounded-md text-left text-xs transition-colors',
          session.sessionId === activeSessionId && 'bg-accent border-primary/40 border-l-2',
        )}
      >
        <button onClick={onClick} className="min-w-0 flex-1 px-3 py-1">
          <div className="flex items-center justify-between">
            <span
              className={cn('truncate', session.sessionId === activeSessionId && 'font-medium')}
            >
              {session.name || session.sessionId.slice(0, 12)}
            </span>
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
              <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
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

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
            <DialogDescription>Enter a new name for this session.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRenameSubmit();
            }}
          >
            <Input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={MAX_SESSION_NAME_LENGTH}
              placeholder="Session name"
              autoFocus
              aria-label="Session name"
            />
            {renameError && <p className="text-destructive mt-2 text-sm">{renameError}</p>}
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRenameDialog(false)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
