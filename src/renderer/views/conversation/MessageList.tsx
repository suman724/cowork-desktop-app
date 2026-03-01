import { useEffect, useRef, useCallback, useState } from 'react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useMessagesStore } from '../../state/messages-store';
import { useSessionStore } from '../../state/session-store';
import { MessageItem } from './MessageItem';

const SCROLL_THRESHOLD = 150; // pixels from bottom
const THINKING_DEBOUNCE_MS = 300;

function ThinkingIndicator(): React.JSX.Element {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="bg-secondary text-secondary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        A
      </div>
      <div className="flex items-center gap-1 pt-1">
        <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full" />
        <span
          className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ animationDelay: '300ms' }}
        />
        <span className="text-muted-foreground ml-2 text-sm">Thinking...</span>
      </div>
    </div>
  );
}

export function MessageList(): React.JSX.Element {
  const messages = useMessagesStore((s) => s.messages);
  const isRunning = useSessionStore((s) => s.taskState?.isRunning ?? false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const anyStreaming = messages.some((m) => m.isStreaming);
  const rawThinking = isRunning && !anyStreaming;
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    if (rawThinking) {
      const timer = setTimeout(() => setShowThinking(true), THINKING_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }
    setShowThinking(false);
    return undefined;
  }, [rawThinking]);

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
  }, [messages, showThinking]);

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
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            {showThinking && <ThinkingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
