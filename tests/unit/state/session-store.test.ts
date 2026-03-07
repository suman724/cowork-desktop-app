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

  it('sets lastFailedPrompt', () => {
    useSessionStore.getState().setLastFailedPrompt('test prompt');
    expect(useSessionStore.getState().lastFailedPrompt).toBe('test prompt');
  });

  it('clears lastFailedPrompt', () => {
    useSessionStore.getState().setLastFailedPrompt('test prompt');
    useSessionStore.getState().setLastFailedPrompt(null);
    expect(useSessionStore.getState().lastFailedPrompt).toBeNull();
  });

  it('initializes lastFailedPrompt as null', () => {
    expect(useSessionStore.getState().lastFailedPrompt).toBeNull();
  });

  it('initializes incompleteTask as null', () => {
    expect(useSessionStore.getState().incompleteTask).toBeNull();
  });

  it('sets incompleteTask', () => {
    const task = {
      taskId: 't-incomplete',
      prompt: 'Fix the bug',
      lastStep: 7,
      maxSteps: 50,
    };
    useSessionStore.getState().setIncompleteTask(task);
    expect(useSessionStore.getState().incompleteTask).toEqual(task);
  });

  it('clears incompleteTask with null', () => {
    useSessionStore.getState().setIncompleteTask({
      taskId: 't-1',
      prompt: 'test',
      lastStep: 3,
      maxSteps: 40,
    });
    useSessionStore.getState().setIncompleteTask(null);
    expect(useSessionStore.getState().incompleteTask).toBeNull();
  });

  it('initializes planMode as false', () => {
    expect(useSessionStore.getState().planMode).toBe(false);
  });

  it('sets planMode', () => {
    useSessionStore.getState().setPlanMode(true);
    expect(useSessionStore.getState().planMode).toBe(true);
  });

  it('initializes isVerifying as false', () => {
    expect(useSessionStore.getState().isVerifying).toBe(false);
  });

  it('sets isVerifying', () => {
    useSessionStore.getState().setVerifying(true);
    expect(useSessionStore.getState().isVerifying).toBe(true);
  });

  it('resets session and task state', () => {
    useSessionStore
      .getState()
      .setSessionState({ sessionId: 's-1', workspaceId: 'ws-1', status: 'ready' });
    useSessionStore.getState().setTaskState({ taskId: 't-1' } as never);
    useSessionStore.getState().setLastFailedPrompt('some prompt');
    useSessionStore.getState().setIncompleteTask({
      taskId: 't-incomplete',
      prompt: 'test',
      lastStep: 5,
      maxSteps: 40,
    });

    useSessionStore.getState().setPlanMode(true);
    useSessionStore.getState().setVerifying(true);

    useSessionStore.getState().reset();

    expect(useSessionStore.getState().sessionState).toBeNull();
    expect(useSessionStore.getState().taskState).toBeNull();
    expect(useSessionStore.getState().lastFailedPrompt).toBeNull();
    expect(useSessionStore.getState().incompleteTask).toBeNull();
    expect(useSessionStore.getState().planMode).toBe(false);
    expect(useSessionStore.getState().isVerifying).toBe(false);
  });
});
