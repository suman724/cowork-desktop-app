import { create } from 'zustand';
import type { ApprovalRequest } from '../../shared/types';

interface ApprovalStore {
  /** FIFO queue of pending approvals */
  pendingApprovals: ApprovalRequest[];

  /** The current approval being shown (first in queue) */
  currentApproval: ApprovalRequest | null;

  /** Add an approval to the queue */
  addApproval: (approval: ApprovalRequest) => void;

  /** Remove and return the resolved approval, advance to next */
  resolveCurrentApproval: () => void;

  /** Clear all pending approvals */
  clear: () => void;
}

export const useApprovalStore = create<ApprovalStore>((set) => ({
  pendingApprovals: [],
  currentApproval: null,

  addApproval: (approval) =>
    set((state) => {
      // Prevent duplicate approvals
      if (state.pendingApprovals.some((a) => a.approvalId === approval.approvalId)) {
        return {};
      }
      const pending = [...state.pendingApprovals, approval];
      return {
        pendingApprovals: pending,
        currentApproval: state.currentApproval ?? approval,
      };
    }),

  resolveCurrentApproval: () =>
    set((state) => {
      const [, ...rest] = state.pendingApprovals;
      return {
        pendingApprovals: rest,
        currentApproval: rest[0] ?? null,
      };
    }),

  clear: () => set({ pendingApprovals: [], currentApproval: null }),
}));
