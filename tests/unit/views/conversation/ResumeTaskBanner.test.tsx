import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumeTaskBanner } from '../../../../src/renderer/views/conversation/ResumeTaskBanner';

const incompleteTask = {
  taskId: 't-incomplete',
  prompt: 'Fix the bug',
  lastStep: 7,
  maxSteps: 50,
};

describe('ResumeTaskBanner', () => {
  it('renders prompt text and step progress', () => {
    render(
      <ResumeTaskBanner incompleteTask={incompleteTask} onResume={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.getByText('Interrupted task detected')).toBeInTheDocument();
    expect(screen.getByText(/Fix the bug/)).toBeInTheDocument();
    expect(screen.getByText(/stopped at step 7\/50/)).toBeInTheDocument();
  });

  it('calls onResume when Resume button is clicked', async () => {
    const onResume = vi.fn();
    render(
      <ResumeTaskBanner incompleteTask={incompleteTask} onResume={onResume} onDismiss={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Resume interrupted task' }));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when Dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    render(
      <ResumeTaskBanner incompleteTask={incompleteTask} onResume={vi.fn()} onDismiss={onDismiss} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss interrupted task' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has status role for accessibility', () => {
    render(
      <ResumeTaskBanner incompleteTask={incompleteTask} onResume={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
