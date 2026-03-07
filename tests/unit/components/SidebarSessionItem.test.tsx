import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarSessionItem } from '../../../src/renderer/components/SidebarSessionItem';
import { useHistoryStore } from '../../../src/renderer/state/history-store';
import type { SessionSummary } from '../../../src/shared/types';

// Mock window.coworkIPC
const mockUpdateSessionName = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: {
    updateSessionName: mockUpdateSessionName,
  },
  writable: true,
});

const baseSession: SessionSummary = {
  sessionId: 'sess-1',
  name: 'Test Session',
  autoNamed: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastTaskAt: '2026-01-01T01:00:00Z',
  taskCount: 3,
};

describe('SidebarSessionItem', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    useHistoryStore.getState().reset();
    useHistoryStore.getState().setSessions([baseSession] as never);
  });

  it('renders session name and task count', () => {
    render(<SidebarSessionItem session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Test Session')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows Rename in dropdown menu', async () => {
    render(<SidebarSessionItem session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText('Session options'));

    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Delete session')).toBeInTheDocument();
  });

  it('opens rename dialog with pre-filled name', async () => {
    render(<SidebarSessionItem session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText('Session options'));
    await user.click(screen.getByText('Rename'));

    expect(screen.getByText('Rename session')).toBeInTheDocument();
    const input = screen.getByLabelText<HTMLInputElement>('Session name');
    expect(input.value).toBe('Test Session');
  });

  it('calls updateSessionName IPC and updates store on submit', async () => {
    mockUpdateSessionName.mockResolvedValue({ success: true, data: undefined });

    render(<SidebarSessionItem session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText('Session options'));
    await user.click(screen.getByText('Rename'));

    const input = screen.getByLabelText('Session name');
    await user.clear(input);
    await user.type(input, 'Renamed Session');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateSessionName).toHaveBeenCalledWith({
        sessionId: 'sess-1',
        name: 'Renamed Session',
      });
    });

    await waitFor(() => {
      const session = useHistoryStore.getState().sessions[0];
      expect(session?.name).toBe('Renamed Session');
    });
  });

  it('shows error when IPC call fails', async () => {
    mockUpdateSessionName.mockResolvedValue({
      success: false,
      error: { code: 'SESSION_ERROR', message: 'Service unavailable' },
    });

    render(<SidebarSessionItem session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText('Session options'));
    await user.click(screen.getByText('Rename'));

    const input = screen.getByLabelText('Session name');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Service unavailable')).toBeInTheDocument();
    });
  });

  it('validates empty name', async () => {
    render(<SidebarSessionItem session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByLabelText('Session options'));
    await user.click(screen.getByText('Rename'));

    const input = screen.getByLabelText('Session name');
    await user.clear(input);
    await user.type(input, '   ');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });

    expect(mockUpdateSessionName).not.toHaveBeenCalled();
  });
});
