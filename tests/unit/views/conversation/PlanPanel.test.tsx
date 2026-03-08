import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '../../../../src/renderer/state/session-store';
import { PlanPanel } from '../../../../src/renderer/views/conversation/PlanPanel';
import type { PlanInfo } from '../../../../src/shared/types';

const SAMPLE_PLAN: PlanInfo = {
  goal: 'Add user authentication',
  steps: [
    { index: 0, description: 'Create DB schema', status: 'completed' },
    { index: 1, description: 'Implement endpoints', status: 'in_progress' },
    { index: 2, description: 'Write tests', status: 'pending' },
  ],
};

describe('PlanPanel', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('renders nothing when no plan exists', () => {
    const { container } = render(<PlanPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders plan goal and progress count', () => {
    useSessionStore.getState().setPlan(SAMPLE_PLAN);
    render(<PlanPanel />);

    expect(screen.getByText('Add user authentication')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('renders all steps with descriptions', () => {
    useSessionStore.getState().setPlan(SAMPLE_PLAN);
    render(<PlanPanel />);

    expect(screen.getByText('Create DB schema')).toBeInTheDocument();
    expect(screen.getByText('Implement endpoints')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('collapses and expands on toggle click', async () => {
    const user = userEvent.setup();
    useSessionStore.getState().setPlan(SAMPLE_PLAN);
    render(<PlanPanel />);

    // Initially expanded — steps visible
    expect(screen.getByTestId('plan-step-list')).toBeInTheDocument();

    // Click to collapse
    await user.click(screen.getByTestId('plan-panel-toggle'));
    expect(screen.queryByTestId('plan-step-list')).not.toBeInTheDocument();

    // Click to expand again
    await user.click(screen.getByTestId('plan-panel-toggle'));
    expect(screen.getByTestId('plan-step-list')).toBeInTheDocument();
  });

  it('counts skipped steps as completed in progress', () => {
    useSessionStore.getState().setPlan({
      goal: 'Test',
      steps: [
        { index: 0, description: 'A', status: 'completed' },
        { index: 1, description: 'B', status: 'skipped' },
        { index: 2, description: 'C', status: 'pending' },
      ],
    });
    render(<PlanPanel />);

    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('applies strikethrough styling to skipped steps', () => {
    useSessionStore.getState().setPlan({
      goal: 'Test',
      steps: [{ index: 0, description: 'Skipped step', status: 'skipped' }],
    });
    render(<PlanPanel />);

    const step = screen.getByTestId('plan-step-0');
    expect(step.className).toContain('line-through');
  });
});
