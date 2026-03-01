import { useCallback } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { ConversationFooter } from './ConversationFooter';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { useSessionStore } from '../../state/session-store';
import { useMessagesStore } from '../../state/messages-store';

export function ConversationView(): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);
  const sessionState = useSessionStore((s) => s.sessionState);
  const addUserMessage = useMessagesStore((s) => s.addUserMessage);

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (!sessionState) return;

      addUserMessage(prompt);

      const taskId = `task-${Date.now()}`;
      void window.coworkIPC
        .startTask({
          sessionId: sessionState.session.sessionId,
          taskId,
          prompt,
          maxSteps: sessionState.policyBundle.llmPolicy.maxOutputTokens,
        })
        .then((result) => {
          if (!result.success) {
            useMessagesStore.getState().addSystemMessage(`Error: ${result.error.message}`);
          }
        });
    },
    [sessionState, addUserMessage],
  );

  const handleCancel = useCallback(() => {
    if (!sessionState || !taskState) return;

    void window.coworkIPC
      .cancelTask({
        sessionId: sessionState.session.sessionId,
        taskId: taskState.taskId,
      })
      .then((result) => {
        if (!result.success) {
          useMessagesStore.getState().addSystemMessage(`Cancel failed: ${result.error.message}`);
        }
      });
  }, [sessionState, taskState]);

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
