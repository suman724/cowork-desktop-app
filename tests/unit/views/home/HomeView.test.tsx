import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSessionStore } from '../../../../src/renderer/state/session-store';
import { HomeView } from '../../../../src/renderer/views/home/HomeView';

// Mock window.coworkIPC
Object.defineProperty(window, 'coworkIPC', {
  value: {
    createSession: vi.fn().mockResolvedValue({
      success: true,
      data: { sessionId: 's-1', workspaceId: 'ws-1', status: 'ready' },
    }),
    startTask: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    selectFolder: vi.fn().mockResolvedValue({ success: true, data: '/home/user/project' }),
  },
  writable: true,
  configurable: true,
});

describe('HomeView', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('renders the greeting', () => {
    render(<HomeView />);
    expect(screen.getByText('What can I help you with?')).toBeInTheDocument();
  });

  it('renders the prompt input', () => {
    render(<HomeView />);
    expect(screen.getByTestId('prompt-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('renders the folder picker button', () => {
    render(<HomeView />);
    expect(screen.getByTestId('select-folder-button')).toBeInTheDocument();
    expect(screen.getByText('Work in a folder')).toBeInTheDocument();
  });

  it('shows selected folder name when workspace path is set', () => {
    useSessionStore.getState().setWorkspacePath('/home/user/my-project');
    render(<HomeView />);
    expect(screen.getByText('my-project')).toBeInTheDocument();
  });
});
