import { useCallback } from 'react';
import { ConversationHeader } from './ConversationHeader';
import { ConversationFooter } from './ConversationFooter';
import { MessageList } from './MessageList';
import { PromptInput } from './PromptInput';
import { useSessionStore } from '../../state/session-store';
import { useStartTask } from '../../hooks/use-start-task';
import { useCancelTask } from '../../hooks/use-cancel-task';

export function ConversationView(): React.JSX.Element {
  const taskState = useSessionStore((s) => s.taskState);
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

  const isTaskRunning = taskState?.isRunning ?? false;

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
