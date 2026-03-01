import { cn } from '../../lib/utils';
import type { DisplayMessage } from '../../../shared/types';
import { ToolCallCard } from './ToolCallCard';

interface MessageItemProps {
  message: DisplayMessage;
}

export function MessageItem({ message }: MessageItemProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        message.role === 'user' && 'bg-muted/50',
        message.role === 'system' && 'bg-muted/30',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
          message.role === 'user' && 'bg-primary text-primary-foreground',
          message.role === 'assistant' && 'bg-secondary text-secondary-foreground',
          message.role === 'system' && 'bg-muted text-muted-foreground',
        )}
      >
        {message.role === 'user' ? 'U' : message.role === 'assistant' ? 'A' : 'S'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm break-words whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span className="bg-foreground ml-0.5 inline-block h-4 w-1 animate-pulse" />
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
