import { useState, useCallback, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type a message...',
}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, disabled, onSubmit]);

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
  );
}
