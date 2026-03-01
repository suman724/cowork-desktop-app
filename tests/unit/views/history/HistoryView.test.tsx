import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useHistoryStore } from '../../../../src/renderer/state/history-store';
import { HistoryView } from '../../../../src/renderer/views/history/HistoryView';

// Mock window.coworkIPC
Object.defineProperty(window, 'coworkIPC', {
  value: {
    listWorkspaces: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          workspaceId: 'ws-1',
          workspaceScope: 'local',
          tenantId: 't-1',
          userId: 'u-1',
          localPath: '/home/user/project',
          createdAt: '2026-01-01',
          lastActiveAt: '2026-01-02',
        },
      ],
    }),
    listSessions: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
  },
  writable: true,
  configurable: true,
});

describe('HistoryView', () => {
  beforeEach(() => {
    useHistoryStore.getState().reset();
  });

  it('renders the history header', () => {
    render(<HistoryView />);
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('shows empty message when no workspace selected', () => {
    render(<HistoryView />);
    expect(screen.getByText('Select a workspace to view sessions')).toBeInTheDocument();
  });
});
