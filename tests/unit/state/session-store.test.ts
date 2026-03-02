import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../../src/renderer/state/session-store';

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    useSessionStore.getState().setAgentRuntimeStatus('stopped');
    useSessionStore.getState().setError(null);
  });

  it('initializes with null session and stopped status', () => {
    const state = useSessionStore.getState();
    expect(state.sessionState).toBeNull();
    expect(state.taskState).toBeNull();
    expect(state.agentRuntimeStatus).toBe('stopped');
    expect(state.error).toBeNull();
  });

  it('sets session state', () => {
    const session = {
      sessionId: 's-1',
      workspaceId: 'ws-1',
      status: 'ready',
    };

    useSessionStore.getState().setSessionState(session);
    expect(useSessionStore.getState().sessionState).toEqual(session);
  });

  it('sets task state', () => {
    const task = {
      taskId: 't-1',
      sessionId: 's-1',
      prompt: 'test',
      currentStep: 0,
      maxSteps: 40,
      isRunning: true,
    };

    useSessionStore.getState().setTaskState(task);
    expect(useSessionStore.getState().taskState).toEqual(task);
  });

  it('updates task step', () => {
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 's-1',
      prompt: 'test',
      currentStep: 0,
      maxSteps: 40,
      isRunning: true,
    });

    useSessionStore.getState().updateTaskStep(5);
    expect(useSessionStore.getState().taskState?.currentStep).toBe(5);
  });

  it('updateTaskStep is no-op when no task', () => {
    useSessionStore.getState().updateTaskStep(5);
    expect(useSessionStore.getState().taskState).toBeNull();
  });

  it('sets task running state', () => {
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 's-1',
      prompt: 'test',
      currentStep: 0,
      maxSteps: 40,
      isRunning: true,
    });

    useSessionStore.getState().setTaskRunning(false);
    expect(useSessionStore.getState().taskState?.isRunning).toBe(false);
  });

  it('sets agent runtime status', () => {
    useSessionStore.getState().setAgentRuntimeStatus('running');
    expect(useSessionStore.getState().agentRuntimeStatus).toBe('running');
  });

  it('resets session and task state', () => {
    useSessionStore
      .getState()
      .setSessionState({ sessionId: 's-1', workspaceId: 'ws-1', status: 'ready' });
    useSessionStore.getState().setTaskState({ taskId: 't-1' } as never);

    useSessionStore.getState().reset();

    expect(useSessionStore.getState().sessionState).toBeNull();
    expect(useSessionStore.getState().taskState).toBeNull();
  });

  // --- Live session tracking tests ---

  it('tracks live session', () => {
    useSessionStore.getState().setLiveSession('s-1', 'ws-1');
    expect(useSessionStore.getState().liveSessionId).toBe('s-1');
    expect(useSessionStore.getState().liveWorkspaceId).toBe('ws-1');
  });

  it('clears live session', () => {
    useSessionStore.getState().setLiveSession('s-1', 'ws-1');
    useSessionStore.getState().clearLiveSession();
    expect(useSessionStore.getState().liveSessionId).toBeNull();
    expect(useSessionStore.getState().liveWorkspaceId).toBeNull();
  });

  it('live session persists through setViewingHistory', () => {
    useSessionStore.getState().setLiveSession('s-1', 'ws-1');
    useSessionStore.getState().setViewingHistory(true);
    expect(useSessionStore.getState().liveSessionId).toBe('s-1');
  });

  it('reset clears live session', () => {
    useSessionStore.getState().setLiveSession('s-1', 'ws-1');
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().liveSessionId).toBeNull();
    expect(useSessionStore.getState().liveWorkspaceId).toBeNull();
  });
});
