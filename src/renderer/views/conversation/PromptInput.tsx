import { useState, useCallback, type KeyboardEvent } from 'react';
import { SendHorizontal, ListChecks, Globe } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { useBrowserStore } from '../../state/browser-store';

interface PromptInputProps {
  onSubmit: (prompt: string, options?: { planOnly?: boolean; browserEnabled?: boolean }) => void;
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
  const browserEnabled = useBrowserStore((s) => s.browserEnabled);
  const browserAvailable = useBrowserStore((s) => s.browserAvailable);
  const setBrowserEnabled = useBrowserStore((s) => s.setBrowserEnabled);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || disabled) return;
    const options: { planOnly?: boolean; browserEnabled?: boolean } = {};
    if (planOnly) options.planOnly = true;
    if (browserEnabled) options.browserEnabled = true;
    onSubmit(trimmed, Object.keys(options).length > 0 ? options : undefined);
    setValue('');
  }, [value, disabled, onSubmit, planOnly, browserEnabled]);

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
    <div className="bg-background border-t px-6 py-4">
      <div className="bg-card focus-within:ring-ring/30 flex gap-2 rounded-xl border p-3 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1">
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
            variant={browserEnabled ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setBrowserEnabled(!browserEnabled);
            }}
            disabled={disabled || !browserAvailable}
            aria-label="Enable browser"
            aria-pressed={browserEnabled}
            title={
              !browserAvailable
                ? 'Browser not available in this session'
                : browserEnabled
                  ? 'Browser enabled'
                  : 'Enable browser'
            }
            data-testid="browser-toggle"
          >
            <Globe className="h-4 w-4" />
          </Button>
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
