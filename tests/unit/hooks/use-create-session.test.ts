import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateSession } from '../../../src/renderer/hooks/use-create-session';
import { useSessionStore } from '../../../src/renderer/state/session-store';
import { useMessagesStore } from '../../../src/renderer/state/messages-store';
import { useUIStore } from '../../../src/renderer/state/ui-store';

const mockCreateSession = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: { createSession: mockCreateSession },
  writable: true,
  configurable: true,
});

describe('useCreateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
    useMessagesStore.getState().clear();
    useUIStore.getState().setView('history');
  });

  it('starts with isLoading=false and error=null', () => {
    const { result } = renderHook(() => useCreateSession());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('creates session successfully', async () => {
    const mockSession = { sessionId: 's-1', workspaceId: 'ws-1', status: 'ready' };
    mockCreateSession.mockResolvedValue({ success: true, data: mockSession });

    const { result } = renderHook(() => useCreateSession());

    await act(async () => {
      await result.current.createSession({ tenantId: 't-1', userId: 'u-1' });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(useSessionStore.getState().sessionState).toEqual(mockSession);
    expect(useUIStore.getState().view).toBe('conversation');
  });

  it('handles IPC failure result', async () => {
    mockCreateSession.mockResolvedValue({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Session limit reached' },
    });

    const { result } = renderHook(() => useCreateSession());

    await act(async () => {
      await result.current.createSession({ tenantId: 't-1', userId: 'u-1' });
    });

    expect(result.current.error).toBe('Session limit reached');
    expect(useSessionStore.getState().sessionState).toBeNull();
  });

  it('handles IPC exception', async () => {
    mockCreateSession.mockRejectedValue(new Error('Bridge down'));

    const { result } = renderHook(() => useCreateSession());

    await act(async () => {
      await result.current.createSession({ tenantId: 't-1', userId: 'u-1' });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Bridge down');
  });
});
