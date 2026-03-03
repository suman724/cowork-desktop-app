import { User, Bot, Info } from 'lucide-react';
import type { DisplayMessage, ToolCallInfo } from '../../../shared/types';
import { ToolCallCard } from './ToolCallCard';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: DisplayMessage;
}

/** Parse a tool role message's JSON content into a ToolCallInfo for consistent rendering. */
function parseToolContent(content: string): ToolCallInfo | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    const type = typeof obj.type === 'string' ? obj.type : '';
    const toolName = typeof obj.toolName === 'string' ? obj.toolName : 'Unknown';

    if (type === 'tool_call') {
      const args =
        typeof obj.arguments === 'object' && obj.arguments !== null
          ? (obj.arguments as Record<string, unknown>)
          : undefined;
      return {
        id: typeof obj.id === 'string' ? obj.id : `tool-${Date.now()}`,
        toolName,
        status: 'running',
        arguments: args,
      };
    } else if (type === 'tool_result') {
      const output = typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
      const errorStr = typeof obj.error === 'string' ? obj.error : undefined;
      return {
        id: typeof obj.id === 'string' ? obj.id : `tool-${Date.now()}`,
        toolName,
        status: errorStr ? 'failed' : 'completed',
        result: output.length > 500 ? output.slice(0, 500) + '...' : output,
        error: errorStr,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function MessageItem({ message }: MessageItemProps): React.JSX.Element {
  // Render tool messages using ToolCallCard for consistent display
  if (message.role === 'tool') {
    const toolInfo = parseToolContent(message.content);
    if (toolInfo) {
      return (
        <div className="flex gap-3 px-4 py-1.5" data-testid="tool-message">
          <div className="w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <ToolCallCard toolCall={toolInfo} />
          </div>
        </div>
      );
    }
    // Fallback: render as plain text
    return (
      <div className="flex gap-3 px-4 py-1.5" data-testid="tool-message-fallback">
        <div className="w-8 shrink-0" />
        <div className="text-muted-foreground min-w-0 flex-1 text-xs break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  // System messages: compact, left-aligned
  if (message.role === 'system') {
    return (
      <div className="flex gap-3 px-4 py-4">
        <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground min-w-0 flex-1 pt-1 text-sm italic">
          {message.content}
        </div>
      </div>
    );
  }

  // User messages: right-aligned bubble
  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-3 px-4 py-4">
        <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5">
          <div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
        </div>
        <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  // Assistant messages: left-aligned, full width with markdown
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="bg-secondary text-secondary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Bot className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <MarkdownRenderer content={message.content} isStreaming={message.isStreaming} />

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
