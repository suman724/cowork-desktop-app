import { useCallback } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { ConversationFooter } from './ConversationFooter';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { useSessionStore } from '../../state/session-store';
import { useMessagesStore } from '../../state/messages-store';
import { useUIStore } from '../../state/ui-store';

export function ConversationView(): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);
  const sessionState = useSessionStore((s) => s.sessionState);
  const addUserMessage = useMessagesStore((s) => s.addUserMessage);

  const handleSubmit = useCallback(
    (prompt: string) => {
      const currentSession = useSessionStore.getState().sessionState;
      if (!currentSession) return;

      const currentTask = useSessionStore.getState().taskState;
      if (currentTask?.isRunning) return;

      addUserMessage(prompt);

      const taskId = `task-${Date.now()}`;
      const settings = useUIStore.getState().settings;

      // Set task state immediately so UI reflects running state
      useSessionStore.getState().setTaskState({
        taskId,
        sessionId: currentSession.session.sessionId,
        prompt,
        currentStep: 0,
        maxSteps: settings.maxStepsPerTask,
        isRunning: true,
      });

      void window.coworkIPC
        .startTask({
          sessionId: currentSession.session.sessionId,
          taskId,
          prompt,
          taskOptions: {
            maxSteps: settings.maxStepsPerTask,
            approvalMode: settings.approvalMode,
          },
        })
        .then((result) => {
          if (!result.success) {
            useMessagesStore.getState().addSystemMessage(`Error: ${result.error.message}`);
            useSessionStore.getState().setTaskRunning(false);
          }
        });
    },
    [addUserMessage],
  );

  const handleCancel = useCallback(() => {
    const currentSession = useSessionStore.getState().sessionState;
    const currentTask = useSessionStore.getState().taskState;
    if (!currentSession || !currentTask) return;

    void window.coworkIPC
      .cancelTask({
        sessionId: currentSession.session.sessionId,
        taskId: currentTask.taskId,
      })
      .then((result) => {
        if (!result.success) {
          useMessagesStore.getState().addSystemMessage(`Cancel failed: ${result.error.message}`);
        }
      });
  }, []);

  const isTaskRunning = taskState?.isRunning ?? false;

  return (
    <div className="flex h-full flex-col">
      <ConversationHeader />
      <MessageList />
      <ConversationFooter onCancel={handleCancel} />
      <PromptInput
        onSubmit={handleSubmit}
        disabled={isTaskRunning || !sessionState}
        placeholder={sessionState ? 'Type a message...' : 'Create a session first'}
      />
    </div>
  );
}
