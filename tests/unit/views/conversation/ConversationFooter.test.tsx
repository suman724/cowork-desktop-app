import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '../../../../src/renderer/state/session-store';
import { ConversationFooter } from '../../../../src/renderer/views/conversation/ConversationFooter';

describe('ConversationFooter — Retry button', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  function setTask(overrides: { isRunning?: boolean } = {}): void {
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 's-1',
      prompt: 'test',
      currentStep: 2,
      maxSteps: 40,
      isRunning: overrides.isRunning ?? false,
    });
  }

  it('shows Retry button when task is not running and canRetry is true', () => {
    setTask({ isRunning: false });
    render(<ConversationFooter onCancel={vi.fn()} onRetry={vi.fn()} canRetry={true} />);

    expect(screen.getByRole('button', { name: 'Retry failed task' })).toBeInTheDocument();
  });

  it('hides Retry button when task is running', () => {
    setTask({ isRunning: true });
    render(<ConversationFooter onCancel={vi.fn()} onRetry={vi.fn()} canRetry={true} />);

    expect(screen.queryByRole('button', { name: 'Retry failed task' })).not.toBeInTheDocument();
  });

  it('hides Retry button when canRetry is false', () => {
    setTask({ isRunning: false });
    render(<ConversationFooter onCancel={vi.fn()} onRetry={vi.fn()} canRetry={false} />);

    expect(screen.queryByRole('button', { name: 'Retry failed task' })).not.toBeInTheDocument();
  });

  it('hides Retry button when canRetry is not provided', () => {
    setTask({ isRunning: false });
    render(<ConversationFooter onCancel={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Retry failed task' })).not.toBeInTheDocument();
  });

  it('calls onRetry when Retry button is clicked', async () => {
    setTask({ isRunning: false });
    const onRetry = vi.fn();
    render(<ConversationFooter onCancel={vi.fn()} onRetry={onRetry} canRetry={true} />);

    await userEvent.click(screen.getByRole('button', { name: 'Retry failed task' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows Cancel button when task is running (not Retry)', () => {
    setTask({ isRunning: true });
    render(<ConversationFooter onCancel={vi.fn()} onRetry={vi.fn()} canRetry={true} />);

    expect(screen.getByRole('button', { name: 'Cancel current task' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry failed task' })).not.toBeInTheDocument();
  });
});
