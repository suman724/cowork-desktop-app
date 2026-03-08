import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { PromptInput } from '../conversation/PromptInput';
import { useAutoSession } from '../../hooks/use-auto-session';
import { useSessionStore } from '../../state/session-store';

export function HomeView(): React.JSX.Element {
  const { startChat, isLoading, error } = useAutoSession();
  const workspacePath = useSessionStore((s) => s.workspacePath);
  const setWorkspacePath = useSessionStore((s) => s.setWorkspacePath);

  const handleSubmit = useCallback(
    (prompt: string, options?: { planOnly?: boolean }) => {
      void startChat(prompt, options);
    },
    [startChat],
  );

  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await window.coworkIPC.selectFolder();
      if (result.success && result.data) {
        setWorkspacePath(result.data);
      }
    } catch {
      // Folder picker cancelled or failed — ignore
    }
  }, [setWorkspacePath]);

  const handleClearFolder = useCallback(() => {
    setWorkspacePath(null);
  }, [setWorkspacePath]);

  const folderName = workspacePath
    ? (workspacePath.split('/').filter(Boolean).pop() ?? workspacePath)
    : null;

  return (
    <div className="flex h-full flex-col items-center justify-center" data-testid="home-view">
      <div className="w-full max-w-2xl space-y-6 px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-foreground text-center text-2xl font-semibold tracking-tight">
            What can I help you with?
          </h1>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-center text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <PromptInput
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder={isLoading ? 'Starting session...' : 'Type a message...'}
          />

          <div className="flex items-center justify-center gap-2">
            {folderName ? (
              <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-1 text-sm">
                <span className="max-w-48 truncate">{folderName}</span>
                <button
                  onClick={handleClearFolder}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear folder selection"
                >
                  &times;
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void handleSelectFolder()}
                disabled={isLoading}
                data-testid="select-folder-button"
              >
                Work in a folder
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
