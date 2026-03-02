import { useCallback, useState } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { ConversationFooter } from './ConversationFooter';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { useSessionStore } from '../../state/session-store';
import { useUIStore } from '../../state/ui-store';
import { useStartTask } from '../../hooks/use-start-task';
import { useCancelTask } from '../../hooks/use-cancel-task';
import { Button } from '../../components/ui/button';

export function ConversationView(): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);
  const sessionState = useSessionStore((s) => s.sessionState);
  const isViewingHistory = useSessionStore((s) => s.isViewingHistory);
  const setViewingHistory = useSessionStore((s) => s.setViewingHistory);
  const setSessionState = useSessionStore((s) => s.setSessionState);
  const { startTask } = useStartTask();
  const { cancelTask } = useCancelTask();
  const tenantId = useUIStore((s) => s.settings.tenantId);
  const userId = useUIStore((s) => s.settings.userId);

  const [isContinuing, setIsContinuing] = useState(false);

  const handleSubmit = useCallback(
    (prompt: string) => {
      void startTask(prompt);
    },
    [startTask],
  );

  const handleCancel = useCallback(() => {
    void cancelTask();
  }, [cancelTask]);

  const handleContinue = useCallback(() => {
    if (!sessionState?.workspaceId) return;
    const workspaceId = sessionState.workspaceId;

    const continueSession = async (): Promise<void> => {
      setIsContinuing(true);
      try {
        const result = await window.coworkIPC.createSession({
          tenantId: tenantId ?? 'dev-tenant',
          userId: userId ?? 'dev-user',
          workspaceHint: { workspaceId },
        });
        if (result.success) {
          setSessionState(result.data);
          setViewingHistory(false);
        }
      } catch {
        // Error handled by IPC wrapper
      } finally {
        setIsContinuing(false);
      }
    };
    void continueSession();
  }, [sessionState, tenantId, userId, setSessionState, setViewingHistory]);

  const isTaskRunning = taskState?.isRunning ?? false;
  const showContinueButton = isViewingHistory && !taskState;

  return (
    <div className="flex h-full flex-col">
      <ConversationHeader />
      <MessageList />
      <ConversationFooter onCancel={handleCancel} />
      {showContinueButton ? (
        <div className="border-t px-4 py-3">
          <Button
            onClick={handleContinue}
            disabled={isContinuing}
            className="w-full"
            data-testid="continue-conversation-button"
          >
            {isContinuing ? 'Starting...' : 'Continue Conversation'}
          </Button>
        </div>
      ) : (
        <PromptInput
          onSubmit={handleSubmit}
          disabled={isTaskRunning}
          placeholder="Type a message..."
        />
      )}
    </div>
  );
}
