import { useState, useCallback, type KeyboardEvent } from 'react';
import { SendHorizontal, ListChecks } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';

interface PromptInputProps {
  onSubmit: (prompt: string, options?: { planOnly?: boolean }) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type a message...',
}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const [planOnly, setPlanOnly] = useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || disabled) return;
    onSubmit(trimmed, planOnly ? { planOnly: true } : undefined);
    setValue('');
  }, [value, disabled, onSubmit, planOnly]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="bg-background border-t p-4">
      <div className="bg-card flex gap-2 rounded-xl border p-2 shadow-sm">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[44px] resize-none border-0 shadow-none focus-visible:ring-0"
          rows={1}
          aria-label="Message input"
          data-testid="prompt-input"
        />
        <div className="flex flex-col justify-end gap-1">
          <Button
            type="button"
            variant={planOnly ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setPlanOnly((prev) => !prev);
            }}
            disabled={disabled}
            aria-label="Plan first"
            aria-pressed={planOnly}
            title={planOnly ? 'Plan mode on — agent will plan before acting' : 'Plan first'}
            data-testid="plan-only-toggle"
          >
            <ListChecks className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={disabled || value.trim().length === 0}
            size="icon"
            aria-label="Send message"
            data-testid="send-button"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
