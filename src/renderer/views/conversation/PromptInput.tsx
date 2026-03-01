import { useState, useCallback, type KeyboardEvent } from 'react';
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
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[44px] resize-none"
          rows={1}
          data-testid="prompt-input"
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || value.trim().length === 0}
          size="default"
          data-testid="send-button"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
