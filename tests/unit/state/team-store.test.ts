import { describe, it, expect, beforeEach } from 'vitest';
import { useTeamStore } from '../../../src/renderer/state/team-store';

describe('useTeamStore', () => {
  beforeEach(() => {
    useTeamStore.setState(useTeamStore.getState().reset() as never);
    // Reset to clean state
    useTeamStore.setState({
      team: null,
      members: [],
      tasks: [],
      messages: [],
      teammateOutput: {},
    });
  });

  it('initializes with null team', () => {
    const state = useTeamStore.getState();
    expect(state.team).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.teammateOutput).toEqual({});
  });

  it('sets team info', () => {
    useTeamStore.getState().setTeam({ teamId: 'tm-1', name: 'Research' });
    expect(useTeamStore.getState().team).toEqual({ teamId: 'tm-1', name: 'Research' });
  });

  it('clears team and all state', () => {
    useTeamStore.getState().setTeam({ teamId: 'tm-1', name: 'Research' });
    useTeamStore.getState().addMember({ name: 'w1', role: 'coder', status: 'running' });
    useTeamStore.getState().clearTeam();

    const state = useTeamStore.getState();
    expect(state.team).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.tasks).toEqual([]);
  });

  it('adds and removes members', () => {
    useTeamStore.getState().addMember({ name: 'w1', role: 'coder', status: 'running' });
    useTeamStore.getState().addMember({ name: 'w2', role: 'tester', status: 'running' });
    expect(useTeamStore.getState().members).toHaveLength(2);

    useTeamStore.getState().removeMember('w1');
    const w1 = useTeamStore.getState().members.find((m) => m.name === 'w1');
    expect(w1?.status).toBe('stopped');
  });

  it('deduplicates members by name', () => {
    useTeamStore.getState().addMember({ name: 'w1', role: 'coder', status: 'running' });
    useTeamStore.getState().addMember({ name: 'w1', role: 'senior coder', status: 'running' });
    expect(useTeamStore.getState().members).toHaveLength(1);
    expect(useTeamStore.getState().members[0]?.role).toBe('senior coder');
  });

  it('upserts tasks', () => {
    useTeamStore.getState().upsertTask({
      task_id: 't-1',
      title: 'Build API',
      status: 'pending',
    });
    expect(useTeamStore.getState().tasks).toHaveLength(1);

    // Update existing task
    useTeamStore.getState().upsertTask({
      task_id: 't-1',
      title: 'Build API',
      status: 'completed',
    });
    expect(useTeamStore.getState().tasks).toHaveLength(1);
    expect(useTeamStore.getState().tasks[0]?.status).toBe('completed');
  });

  it('adds messages', () => {
    useTeamStore.getState().addMessage({
      id: 'm-1',
      from: 'w1',
      to: 'lead',
      content: 'Done!',
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(useTeamStore.getState().messages).toHaveLength(1);
  });

  it('appends teammate output', () => {
    useTeamStore.getState().appendTeammateOutput('w1', 'Hello ');
    useTeamStore.getState().appendTeammateOutput('w1', 'world');
    expect(useTeamStore.getState().teammateOutput['w1']).toBe('Hello world');
  });

  it('teammate output accumulates per-teammate', () => {
    useTeamStore.getState().appendTeammateOutput('w1', 'A');
    useTeamStore.getState().appendTeammateOutput('w2', 'B');
    expect(useTeamStore.getState().teammateOutput['w1']).toBe('A');
    expect(useTeamStore.getState().teammateOutput['w2']).toBe('B');
  });
});
