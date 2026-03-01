import { useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useMessagesStore } from '../../state/messages-store';
import { MessageItem } from './MessageItem';

const SCROLL_THRESHOLD = 150; // pixels from bottom

export function MessageList(): React.JSX.Element {
  const messages = useMessagesStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Only auto-scroll when the user is already near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1">
      <div ref={scrollContainerRef} className="flex flex-col" onScroll={handleScroll}>
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
