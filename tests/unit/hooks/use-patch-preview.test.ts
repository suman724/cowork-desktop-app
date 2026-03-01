import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePatchPreview } from '../../../src/renderer/hooks/use-patch-preview';
import { useSessionStore } from '../../../src/renderer/state/session-store';
import { useUIStore } from '../../../src/renderer/state/ui-store';

const mockGetPatchPreview = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: { getPatchPreview: mockGetPatchPreview },
  writable: true,
  configurable: true,
});

describe('usePatchPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
    useSessionStore.getState().setSessionState({
      sessionId: 's-1',
      workspaceId: 'ws-1',
      status: 'ready',
    });
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 's-1',
      prompt: 'test',
      currentStep: 1,
      maxSteps: 40,
      isRunning: false,
    });
    useUIStore.getState().setView('conversation');
    useUIStore.getState().setPatchPreview(null);
  });

  it('fetches patch preview and stores in UI store', async () => {
    const mockPatch = {
      taskId: 't-1',
      files: [{ filePath: 'a.ts', status: 'modified', hunks: '+new line' }],
    };
    mockGetPatchPreview.mockResolvedValue({ success: true, data: mockPatch });

    const { result } = renderHook(() => usePatchPreview());

    let patch: unknown;
    await act(async () => {
      patch = await result.current.fetchPatchPreview();
    });

    expect(patch).toEqual(mockPatch);
    expect(useUIStore.getState().patchPreview).toEqual(mockPatch);
    expect(useUIStore.getState().view).toBe('patch');
  });

  it('returns null and sets error on failure', async () => {
    mockGetPatchPreview.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'No patches available' },
    });

    const { result } = renderHook(() => usePatchPreview());

    let patch: unknown;
    await act(async () => {
      patch = await result.current.fetchPatchPreview();
    });

    expect(patch).toBeNull();
    expect(result.current.error).toBe('No patches available');
  });

  it('returns null when no active task', async () => {
    useSessionStore.getState().setTaskState(null);

    const { result } = renderHook(() => usePatchPreview());

    let patch: unknown;
    await act(async () => {
      patch = await result.current.fetchPatchPreview();
    });

    expect(patch).toBeNull();
    expect(result.current.error).toBe('No active task');
  });
});
