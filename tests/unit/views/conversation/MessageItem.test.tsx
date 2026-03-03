import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from '../../../../src/renderer/views/conversation/MessageItem';
import type { DisplayMessage } from '../../../../src/shared/types';

function makeSystemMessage(
  content: string,
  severity?: 'info' | 'warning' | 'error',
): DisplayMessage {
  return {
    id: 'msg-1',
    role: 'system',
    content,
    timestamp: '2026-01-01T00:00:00Z',
    severity,
  };
}

describe('MessageItem — system message severity rendering', () => {
  it('renders info severity by default (no severity prop)', () => {
    render(<MessageItem message={makeSystemMessage('Some info')} />);

    const container = screen.getByTestId('system-message-info');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Some info')).toBeInTheDocument();
  });

  it('renders info severity explicitly', () => {
    render(<MessageItem message={makeSystemMessage('Explicit info', 'info')} />);

    expect(screen.getByTestId('system-message-info')).toBeInTheDocument();
  });

  it('renders error severity with destructive styles', () => {
    render(<MessageItem message={makeSystemMessage('Error: Rate limited', 'error')} />);

    const container = screen.getByTestId('system-message-error');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Error: Rate limited')).toBeInTheDocument();

    // Check that the icon container has destructive styling
    const iconContainer = container.querySelector('.bg-destructive\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders warning severity with yellow styles', () => {
    render(<MessageItem message={makeSystemMessage('Retrying LLM call...', 'warning')} />);

    const container = screen.getByTestId('system-message-warning');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Retrying LLM call...')).toBeInTheDocument();

    // Check that the icon container has warning styling
    const iconContainer = container.querySelector('.bg-yellow-500\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders user messages without severity styling', () => {
    const userMsg: DisplayMessage = {
      id: 'msg-2',
      role: 'user',
      content: 'Hello',
      timestamp: '2026-01-01T00:00:00Z',
    };
    render(<MessageItem message={userMsg} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.queryByTestId('system-message-info')).not.toBeInTheDocument();
    expect(screen.queryByTestId('system-message-error')).not.toBeInTheDocument();
  });
});
