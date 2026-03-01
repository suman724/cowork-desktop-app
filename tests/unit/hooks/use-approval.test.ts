import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApproval } from '../../../src/renderer/hooks/use-approval';
import { useApprovalStore } from '../../../src/renderer/state/approval-store';

const mockResolveApproval = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: { resolveApproval: mockResolveApproval },
  writable: true,
  configurable: true,
});

describe('useApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApprovalStore.getState().clear();
    useApprovalStore.getState().addApproval({
      approvalId: 'a-1',
      sessionId: 's-1',
      taskId: 't-1',
      toolName: 'Shell.Exec',
      title: 'Run command',
      actionSummary: 'rm -rf /tmp/test',
      riskLevel: 'high',
    } as never);
  });

  it('starts with isLoading=false and error=null', () => {
    const { result } = renderHook(() => useApproval());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('approves and resolves the current approval', async () => {
    mockResolveApproval.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useApproval());

    await act(async () => {
      await result.current.approve('looks safe');
    });

    expect(mockResolveApproval).toHaveBeenCalledWith({
      approvalId: 'a-1',
      decision: 'approved',
      reason: 'looks safe',
    });
    expect(useApprovalStore.getState().currentApproval).toBeNull();
  });

  it('denies the current approval', async () => {
    mockResolveApproval.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useApproval());

    await act(async () => {
      await result.current.deny('too risky');
    });

    expect(mockResolveApproval).toHaveBeenCalledWith({
      approvalId: 'a-1',
      decision: 'denied',
      reason: 'too risky',
    });
  });

  it('sets error on IPC failure without advancing queue', async () => {
    mockResolveApproval.mockResolvedValue({
      success: false,
      error: { code: 'TIMEOUT', message: 'Approval timed out' },
    });

    const { result } = renderHook(() => useApproval());

    await act(async () => {
      await result.current.approve();
    });

    expect(result.current.error).toBe('Approval timed out');
    expect(useApprovalStore.getState().currentApproval).not.toBeNull();
  });

  it('sets error on IPC exception', async () => {
    mockResolveApproval.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApproval());

    await act(async () => {
      await result.current.approve();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('does nothing when no approval is pending', async () => {
    useApprovalStore.getState().clear();

    const { result } = renderHook(() => useApproval());

    await act(async () => {
      await result.current.approve();
    });

    expect(mockResolveApproval).not.toHaveBeenCalled();
  });
});
