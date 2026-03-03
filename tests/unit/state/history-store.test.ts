import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../../../src/renderer/state/history-store';

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().reset();
  });

  it('initializes with empty state', () => {
    const state = useHistoryStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.selectedWorkspaceId).toBeNull();
    expect(state.isLoadingWorkspaces).toBe(false);
    expect(state.isLoadingSessions).toBe(false);
  });

  it('sets workspaces', () => {
    const workspaces = [{ workspaceId: 'ws-1' }, { workspaceId: 'ws-2' }];
    useHistoryStore.getState().setWorkspaces(workspaces as never);

    expect(useHistoryStore.getState().workspaces).toEqual(workspaces);
  });

  it('sets sessions', () => {
    const sessions = [{ sessionId: 'ss-1' }];
    useHistoryStore.getState().setSessions(sessions as never);

    expect(useHistoryStore.getState().sessions).toEqual(sessions);
  });

  it('clears sessions when selecting a new workspace', () => {
    useHistoryStore.getState().setSessions([{ sessionId: 'ss-1' }] as never);
    useHistoryStore.getState().setSelectedWorkspaceId('ws-2');

    expect(useHistoryStore.getState().sessions).toEqual([]);
    expect(useHistoryStore.getState().selectedWorkspaceId).toBe('ws-2');
  });

  it('sets loading flags', () => {
    useHistoryStore.getState().setLoadingWorkspaces(true);
    expect(useHistoryStore.getState().isLoadingWorkspaces).toBe(true);

    useHistoryStore.getState().setLoadingSessions(true);
    expect(useHistoryStore.getState().isLoadingSessions).toBe(true);
  });

  it('sets error', () => {
    useHistoryStore.getState().setError('Something went wrong');
    expect(useHistoryStore.getState().error).toBe('Something went wrong');
  });

  it('removes a workspace by id', () => {
    useHistoryStore
      .getState()
      .setWorkspaces([
        { workspaceId: 'ws-1' },
        { workspaceId: 'ws-2' },
        { workspaceId: 'ws-3' },
      ] as never);
    useHistoryStore.getState().setSelectedWorkspaceId('ws-2');

    useHistoryStore.getState().removeWorkspace('ws-2');

    const state = useHistoryStore.getState();
    expect(state.workspaces).toHaveLength(2);
    expect(state.workspaces.map((w) => w.workspaceId)).toEqual(['ws-1', 'ws-3']);
    expect(state.selectedWorkspaceId).toBeNull();
  });

  it('removes a workspace without affecting selectedWorkspaceId if different', () => {
    useHistoryStore
      .getState()
      .setWorkspaces([{ workspaceId: 'ws-1' }, { workspaceId: 'ws-2' }] as never);
    useHistoryStore.getState().setSelectedWorkspaceId('ws-1');

    useHistoryStore.getState().removeWorkspace('ws-2');

    expect(useHistoryStore.getState().selectedWorkspaceId).toBe('ws-1');
  });

  it('removes a session by id', () => {
    useHistoryStore
      .getState()
      .setSessions([{ sessionId: 'ss-1' }, { sessionId: 'ss-2' }, { sessionId: 'ss-3' }] as never);

    useHistoryStore.getState().removeSession('ss-2');

    const sessions = useHistoryStore.getState().sessions;
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.sessionId)).toEqual(['ss-1', 'ss-3']);
  });

  it('resets all state', () => {
    useHistoryStore.getState().setWorkspaces([{ workspaceId: 'ws-1' }] as never);
    useHistoryStore.getState().setSelectedWorkspaceId('ws-1');
    useHistoryStore.getState().setError('err');

    useHistoryStore.getState().reset();

    const state = useHistoryStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.selectedWorkspaceId).toBeNull();
    expect(state.error).toBeNull();
  });
});
