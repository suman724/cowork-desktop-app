import { describe, it, expect, beforeEach } from 'vitest';
import { useApprovalStore } from '../../../src/renderer/state/approval-store';
import type { ApprovalRequest } from '../../../src/shared/types';

function mockApproval(id: string): ApprovalRequest {
  return {
    approvalId: id,
    sessionId: 's-1',
    taskId: 't-1',
    stepId: 'step-1',
    title: `Approval ${id}`,
    actionSummary: 'Do something',
    riskLevel: 'medium',
    details: {},
  } as ApprovalRequest;
}

describe('useApprovalStore', () => {
  beforeEach(() => {
    useApprovalStore.getState().clear();
  });

  it('starts with no pending approvals', () => {
    const state = useApprovalStore.getState();
    expect(state.pendingApprovals).toEqual([]);
    expect(state.currentApproval).toBeNull();
  });

  it('adds an approval and sets it as current', () => {
    useApprovalStore.getState().addApproval(mockApproval('a-1'));

    const state = useApprovalStore.getState();
    expect(state.pendingApprovals).toHaveLength(1);
    expect(state.currentApproval?.approvalId).toBe('a-1');
  });

  it('queues multiple approvals (FIFO)', () => {
    useApprovalStore.getState().addApproval(mockApproval('a-1'));
    useApprovalStore.getState().addApproval(mockApproval('a-2'));
    useApprovalStore.getState().addApproval(mockApproval('a-3'));

    const state = useApprovalStore.getState();
    expect(state.pendingApprovals).toHaveLength(3);
    expect(state.currentApproval?.approvalId).toBe('a-1');
  });

  it('resolves current approval and advances to next', () => {
    useApprovalStore.getState().addApproval(mockApproval('a-1'));
    useApprovalStore.getState().addApproval(mockApproval('a-2'));

    useApprovalStore.getState().resolveCurrentApproval();

    const state = useApprovalStore.getState();
    expect(state.pendingApprovals).toHaveLength(1);
    expect(state.currentApproval?.approvalId).toBe('a-2');
  });

  it('sets currentApproval to null when queue is empty', () => {
    useApprovalStore.getState().addApproval(mockApproval('a-1'));
    useApprovalStore.getState().resolveCurrentApproval();

    const state = useApprovalStore.getState();
    expect(state.pendingApprovals).toHaveLength(0);
    expect(state.currentApproval).toBeNull();
  });

  it('clears all approvals', () => {
    useApprovalStore.getState().addApproval(mockApproval('a-1'));
    useApprovalStore.getState().addApproval(mockApproval('a-2'));
    useApprovalStore.getState().clear();

    const state = useApprovalStore.getState();
    expect(state.pendingApprovals).toEqual([]);
    expect(state.currentApproval).toBeNull();
  });
});
