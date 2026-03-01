import { useCallback } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { ConversationFooter } from './ConversationFooter';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { Button } from '../../components/ui/button';
import { useSessionStore } from '../../state/session-store';
import { useUIStore } from '../../state/ui-store';
import { useCreateSession } from '../../hooks/use-create-session';
import { useStartTask } from '../../hooks/use-start-task';
import { useCancelTask } from '../../hooks/use-cancel-task';

export function ConversationView(): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);
  const sessionState = useSessionStore((s) => s.sessionState);
  const { createSession, isLoading: isCreatingSession } = useCreateSession();
  const { startTask } = useStartTask();
  const { cancelTask } = useCancelTask();

  const handleSubmit = useCallback(
    (prompt: string) => {
      void startTask(prompt);
    },
    [startTask],
  );

  const handleCancel = useCallback(() => {
    void cancelTask();
  }, [cancelTask]);

  const handleNewSession = useCallback(() => {
    const settings = useUIStore.getState().settings;
    void createSession({
      tenantId: settings.tenantId ?? 'dev-tenant',
      userId: settings.userId ?? 'dev-user',
    });
  }, [createSession]);

  const isTaskRunning = taskState?.isRunning ?? false;

  if (!sessionState) {
    return (
      <div className="flex h-full flex-col">
        <ConversationHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground text-sm">No active session</p>
          <Button onClick={handleNewSession} disabled={isCreatingSession}>
            {isCreatingSession ? 'Creating...' : 'New Session'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ConversationHeader />
      <MessageList />
      <ConversationFooter onCancel={handleCancel} />
      <PromptInput
        onSubmit={handleSubmit}
        disabled={isTaskRunning}
        placeholder="Type a message..."
      />
    </div>
  );
}
