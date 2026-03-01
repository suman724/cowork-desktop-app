import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCancelTask } from '../../../src/renderer/hooks/use-cancel-task';
import { useSessionStore } from '../../../src/renderer/state/session-store';

const mockCancelTask = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: { cancelTask: mockCancelTask },
  writable: true,
  configurable: true,
});

describe('useCancelTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
    useSessionStore.getState().setSessionState({
      session: { sessionId: 's-1' },
      policyBundle: {},
      workspaceId: 'ws-1',
    } as never);
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 's-1',
      prompt: 'test',
      currentStep: 1,
      maxSteps: 40,
      isRunning: true,
    });
  });

  it('cancels a running task', async () => {
    mockCancelTask.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useCancelTask());

    await act(async () => {
      await result.current.cancelTask();
    });

    expect(mockCancelTask).toHaveBeenCalledWith({ sessionId: 's-1', taskId: 't-1' });
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error when no active task', async () => {
    useSessionStore.getState().setTaskState(null);

    const { result } = renderHook(() => useCancelTask());

    await act(async () => {
      await result.current.cancelTask();
    });

    expect(result.current.error).toBe('No active task');
    expect(mockCancelTask).not.toHaveBeenCalled();
  });

  it('handles IPC exception', async () => {
    mockCancelTask.mockRejectedValue(new Error('Bridge crash'));

    const { result } = renderHook(() => useCancelTask());

    await act(async () => {
      await result.current.cancelTask();
    });

    expect(result.current.error).toBe('Bridge crash');
    expect(result.current.isLoading).toBe(false);
  });
});
