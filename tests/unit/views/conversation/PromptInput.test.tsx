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

    expect(onSubmit).toHaveBeenCalledWith('Hello world', undefined);
  });

  it('calls onSubmit on Enter (without Shift)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    const input = screen.getByTestId('prompt-input');
    await user.type(input, 'Hello{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('Hello', undefined);
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

  it('renders plan-only toggle button', () => {
    render(<PromptInput onSubmit={vi.fn()} />);

    expect(screen.getByTestId('plan-only-toggle')).toBeInTheDocument();
    expect(screen.getByLabelText('Plan first')).toHaveAttribute('aria-pressed', 'false');
  });

  it('passes planOnly option when toggle is active', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PromptInput onSubmit={onSubmit} />);

    // Toggle plan mode on
    await user.click(screen.getByTestId('plan-only-toggle'));
    expect(screen.getByTestId('plan-only-toggle')).toHaveAttribute('aria-pressed', 'true');

    // Submit
    const input = screen.getByTestId('prompt-input');
    await user.type(input, 'Build a feature{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('Build a feature', { planOnly: true });
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
