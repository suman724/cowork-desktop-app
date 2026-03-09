import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamStore } from '../../../src/renderer/state/team-store';
import type { TeamEvent } from '../../../src/shared/types';

// Capture the event handler registered via onTeamEvent
let teamEventHandler: ((event: TeamEvent) => void) | null = null;
const mockCleanup = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: {
    onSessionEvent: vi.fn(() => vi.fn()),
    onTeamEvent: vi.fn((handler: (event: TeamEvent) => void) => {
      teamEventHandler = handler;
      return mockCleanup;
    }),
    onRuntimeStatusChanged: vi.fn(() => vi.fn()),
    onRuntimeCrashed: vi.fn(() => vi.fn()),
  },
  writable: true,
  configurable: true,
});

// Import hook AFTER mocking IPC
import { useTeamEvents } from '../../../src/renderer/hooks/use-team-events';

function fireTeamEvent(method: string, params: Record<string, unknown> = {}): void {
  if (!teamEventHandler) throw new Error('No team event handler registered');
  teamEventHandler({ method, params });
}

describe('useTeamEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamEventHandler = null;
    useTeamStore.setState({
      team: null,
      members: [],
      tasks: [],
      messages: [],
      teammateOutput: {},
    });
  });

  function setup(): void {
    renderHook(() => useTeamEvents());
  }

  it('registers onTeamEvent listener', () => {
    setup();
    expect(window.coworkIPC.onTeamEvent).toHaveBeenCalledOnce();
  });

  it('handles team/created', () => {
    setup();
    act(() => {
      fireTeamEvent('team/created', { teamId: 'tm-1', name: 'Research' });
    });
    expect(useTeamStore.getState().team).toEqual({ teamId: 'tm-1', name: 'Research' });
  });

  it('handles team/teammate_created', () => {
    setup();
    act(() => {
      fireTeamEvent('team/teammate_created', {
        teamId: 'tm-1',
        name: 'researcher',
        role: 'research',
      });
    });
    const members = useTeamStore.getState().members;
    expect(members).toHaveLength(1);
    expect(members[0]?.name).toBe('researcher');
    expect(members[0]?.status).toBe('running');
  });

  it('handles team/teammate_removed', () => {
    setup();
    act(() => {
      fireTeamEvent('team/teammate_created', {
        teamId: 'tm-1',
        name: 'w1',
        role: 'coder',
      });
    });
    act(() => {
      fireTeamEvent('team/teammate_removed', { teamId: 'tm-1', name: 'w1' });
    });
    const w1 = useTeamStore.getState().members.find((m) => m.name === 'w1');
    expect(w1?.status).toBe('stopped');
  });

  it('handles team/task_updated — creates new task', () => {
    setup();
    act(() => {
      fireTeamEvent('team/task_updated', {
        teamId: 'tm-1',
        task: { task_id: 't-1', title: 'Build API', status: 'pending', assignee: 'w1' },
      });
    });
    expect(useTeamStore.getState().tasks).toHaveLength(1);
    expect(useTeamStore.getState().tasks[0]?.title).toBe('Build API');
  });

  it('handles team/task_updated — updates existing task', () => {
    setup();
    act(() => {
      fireTeamEvent('team/task_updated', {
        teamId: 'tm-1',
        task: { task_id: 't-1', title: 'Build API', status: 'pending' },
      });
    });
    act(() => {
      fireTeamEvent('team/task_updated', {
        teamId: 'tm-1',
        task: { task_id: 't-1', title: 'Build API', status: 'completed' },
      });
    });
    expect(useTeamStore.getState().tasks).toHaveLength(1);
    expect(useTeamStore.getState().tasks[0]?.status).toBe('completed');
  });

  it('handles team/message', () => {
    setup();
    act(() => {
      fireTeamEvent('team/message', {
        teamId: 'tm-1',
        from: 'researcher',
        to: 'lead',
        content: 'Found the data',
      });
    });
    const messages = useTeamStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.from).toBe('researcher');
    expect(messages[0]?.content).toBe('Found the data');
  });

  it('handles team/teammate_output', () => {
    setup();
    act(() => {
      fireTeamEvent('team/teammate_output', {
        teamId: 'tm-1',
        name: 'w1',
        content: 'Working on it...',
      });
    });
    expect(useTeamStore.getState().teammateOutput['w1']).toBe('Working on it...');
  });

  it('ignores unknown team methods', () => {
    setup();
    act(() => {
      fireTeamEvent('team/unknown', { teamId: 'tm-1' });
    });
    // No crash, no state changes
    expect(useTeamStore.getState().team).toBeNull();
  });

  it('validates payload fields with typeof checks', () => {
    setup();
    // Invalid teamId should be ignored
    act(() => {
      fireTeamEvent('team/created', { teamId: 123, name: 'bad' });
    });
    expect(useTeamStore.getState().team).toBeNull();
  });
});
