import { useCallback, useState } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { PlanPanel } from './PlanPanel';
import { BrowserPanel } from './BrowserPanel';
import { ConversationFooter } from './ConversationFooter';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { ResumeTaskBanner } from './ResumeTaskBanner';
import { useSessionStore } from '../../state/session-store';
import { useStartTask } from '../../hooks/use-start-task';
import { useCancelTask } from '../../hooks/use-cancel-task';
import { useEventReplay } from '../../hooks/use-event-replay';
import { Button } from '../../components/ui/button';

export function ConversationView(): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);
  const sessionState = useSessionStore((s) => s.sessionState);
  const isViewingHistory = useSessionStore((s) => s.isViewingHistory);
  const setViewingHistory = useSessionStore((s) => s.setViewingHistory);
  const setSessionState = useSessionStore((s) => s.setSessionState);
  const lastFailedPrompt = useSessionStore((s) => s.lastFailedPrompt);
  const incompleteTask = useSessionStore((s) => s.incompleteTask);
  const clearIncompleteTask = useSessionStore((s) => s.setIncompleteTask);
  const { startTask, resumeTask } = useStartTask();
  const { cancelTask } = useCancelTask();

  // Replay missed events when returning to conversation view
  useEventReplay();

  const [isContinuing, setIsContinuing] = useState(false);

  const handleRetry = useCallback(() => {
    if (lastFailedPrompt) {
      void startTask(lastFailedPrompt);
    }
  }, [lastFailedPrompt, startTask]);

  const handleSubmit = useCallback(
    (prompt: string, options?: { planOnly?: boolean; browserEnabled?: boolean }) => {
      void startTask(prompt, options);
    },
    [startTask],
  );

  const handleCancel = useCallback(() => {
    void cancelTask();
  }, [cancelTask]);

  const handleContinue = useCallback(() => {
    if (!sessionState?.sessionId) return;
    const sessionId = sessionState.sessionId;

    const continueSession = async (): Promise<void> => {
      setIsContinuing(true);
      try {
        const result = await window.coworkIPC.resumeSession({ sessionId });
        if (result.success) {
          setSessionState(result.data);
          useSessionStore.getState().clearPlanState();
          setViewingHistory(false);

          // Check for incomplete task from crash recovery
          const stateResult = await window.coworkIPC.getSessionState({ sessionId });
          if (stateResult.success && stateResult.data.incompleteTask) {
            useSessionStore.getState().setIncompleteTask(stateResult.data.incompleteTask);
          }
        }
      } catch {
        // Error handled by IPC wrapper
      } finally {
        setIsContinuing(false);
      }
    };
    void continueSession();
  }, [sessionState, setSessionState, setViewingHistory]);

  const isTaskRunning = taskState?.isRunning ?? false;
  const showContinueButton = isViewingHistory && !taskState;

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader />
        <PlanPanel />
        <MessageList />
        <ConversationFooter
          onCancel={handleCancel}
          onRetry={handleRetry}
          canRetry={lastFailedPrompt !== null}
        />
        {incompleteTask && !isTaskRunning && (
          <ResumeTaskBanner
            incompleteTask={incompleteTask}
            onResume={() => void resumeTask(incompleteTask)}
            onDismiss={() => clearIncompleteTask(null)}
          />
        )}
        {showContinueButton ? (
          <div className="border-t px-6 py-3">
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
      <BrowserPanel />
    </div>
  );
}
