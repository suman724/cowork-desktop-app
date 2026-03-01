import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from '../../../../src/renderer/views/conversation/PromptInput';

describe('PromptInput', () => {
  it('renders a text area and send button', () => {
    render(<PromptInput onSubmit={vi.fn()} />);

    expect(screen.getByTestId('prompt-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('calls onSubmit with trimmed text on button click', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('prompt-input');
    await user.type(input, '  Hello world  ');
    await user.click(screen.getByTestId('send-button'));

    expect(onSubmit).toHaveBeenCalledWith('Hello world');
  });

  it('calls onSubmit on Enter (without Shift)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('prompt-input');
    await user.type(input, 'Hello{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('Hello');
  });

  it('does not submit on Shift+Enter', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('prompt-input');
    await user.type(input, 'Hello{Shift>}{Enter}{/Shift}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit empty text', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('send-button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<PromptInput onSubmit={vi.fn()} disabled={true} />);

    expect(screen.getByTestId('prompt-input')).toBeDisabled();
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });

  it('clears input after submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('prompt-input');
    await user.type(input, 'Hello{Enter}');

    expect(input).toHaveValue('');
  });
});
