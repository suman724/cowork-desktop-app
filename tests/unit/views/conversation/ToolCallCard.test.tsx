import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolCallCard } from '../../../../src/renderer/views/conversation/ToolCallCard';

describe('ToolCallCard', () => {
  it('renders tool name and status', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'ReadFile', status: 'running' }} />);

    expect(screen.getByText('ReadFile')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows completed status', () => {
    render(
      <ToolCallCard
        toolCall={{ id: 'tc-1', toolName: 'WriteFile', status: 'completed', result: 'OK' }}
      />,
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows failed status with error', () => {
    render(
      <ToolCallCard
        toolCall={{ id: 'tc-1', toolName: 'Shell', status: 'failed', error: 'Permission denied' }}
      />,
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<ToolCallCard toolCall={{ id: 'tc-1', toolName: 'Network', status: 'pending' }} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows denied status with error', () => {
    render(
      <ToolCallCard
        toolCall={{
          id: 'tc-1',
          toolName: 'Shell',
          status: 'denied',
          error: 'Capability denied by policy',
        }}
      />,
    );

    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(screen.getByText('Capability denied by policy')).toBeInTheDocument();
  });
});
