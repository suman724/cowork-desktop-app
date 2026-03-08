import { User, Bot, Info, AlertCircle, AlertTriangle } from 'lucide-react';
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
        <div className="flex gap-3 px-6 py-1.5" data-testid="tool-message">
          <div className="w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <ToolCallCard toolCall={toolInfo} />
          </div>
        </div>
      );
    }
    // Fallback: render as plain text
    return (
      <div className="flex gap-3 px-6 py-1.5" data-testid="tool-message-fallback">
        <div className="w-8 shrink-0" />
        <div className="text-muted-foreground min-w-0 flex-1 text-xs break-words whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  // System messages: compact, left-aligned, severity-aware
  if (message.role === 'system') {
    const severity = message.severity ?? 'info';
    let Icon = Info;
    let iconBg = 'bg-muted text-muted-foreground';
    let textClass = 'text-muted-foreground italic';
    if (severity === 'error') {
      Icon = AlertCircle;
      iconBg = 'bg-destructive/10 text-destructive';
      textClass = 'text-destructive';
    } else if (severity === 'warning') {
      Icon = AlertTriangle;
      iconBg = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      textClass = 'text-yellow-600 dark:text-yellow-400';
    }
    return (
      <div className="animate-message-in flex gap-3 px-6 py-5" data-testid={`system-message-${severity}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className={`min-w-0 flex-1 pt-1 text-sm ${textClass}`}>{message.content}</div>
      </div>
    );
  }

  // User messages: right-aligned bubble with soft tint
  if (message.role === 'user') {
    return (
      <div className="animate-message-in flex justify-end gap-3 px-6 py-5">
        <div className="bg-[var(--color-user-bubble)] text-[var(--color-user-bubble-foreground)] max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
          <div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
        </div>
        <div className="bg-[var(--color-user-bubble)] text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  // Assistant messages: left-aligned, full width with markdown
  return (
    <div className="animate-message-in flex gap-3 px-6 py-5">
      <div className="bg-[var(--color-assistant-avatar)] text-[var(--color-assistant-avatar-foreground)] flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
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
