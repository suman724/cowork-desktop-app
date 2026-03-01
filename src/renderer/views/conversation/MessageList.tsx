import { useEffect, useRef } from 'react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useMessagesStore } from '../../state/messages-store';
import { MessageItem } from './MessageItem';

export function MessageList(): React.JSX.Element {
  const messages = useMessagesStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <p className="text-muted-foreground text-sm">
              Start a conversation by typing a message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
