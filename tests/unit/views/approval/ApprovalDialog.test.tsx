import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useApprovalStore } from '../../../../src/renderer/state/approval-store';
import { ApprovalDialog } from '../../../../src/renderer/views/approval/ApprovalDialog';

// Mock window.coworkIPC
const mockResolveApproval = vi.fn().mockResolvedValue({ success: true, data: null });

Object.defineProperty(window, 'coworkIPC', {
  value: {
    resolveApproval: mockResolveApproval,
  },
  writable: true,
});

describe('ApprovalDialog', () => {
  beforeEach(() => {
    useApprovalStore.getState().clear();
    vi.clearAllMocks();
  });

  it('renders nothing when no approval is pending', () => {
    const { container } = render(<ApprovalDialog />);
    expect(container.innerHTML).toBe('');
  });

  it('renders approval dialog when an approval is pending', () => {
    useApprovalStore.getState().addApproval({
      approvalId: 'a-1',
      sessionId: 's-1',
      taskId: 't-1',
      title: 'Run shell command',
      actionSummary: 'Execute: rm -rf /tmp/test',
      riskLevel: 'high',
    } as never);

    render(<ApprovalDialog />);

    expect(screen.getByText('Approval Required')).toBeInTheDocument();
    expect(screen.getByText('Run shell command')).toBeInTheDocument();
    expect(screen.getByText('Execute: rm -rf /tmp/test')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('calls resolveApproval and advances queue on approve', async () => {
    useApprovalStore.getState().addApproval({
      approvalId: 'a-1',
      sessionId: 's-1',
      taskId: 't-1',
      title: 'File write',
      actionSummary: 'Write to /tmp/file',
      riskLevel: 'low',
    } as never);

    render(<ApprovalDialog />);

    fireEvent.click(screen.getByText('Approve'));

    // Wait for async
    await vi.waitFor(() => {
      expect(mockResolveApproval).toHaveBeenCalledWith({
        approvalId: 'a-1',
        decision: 'approved',
        reason: undefined,
      });
    });
  });

  it('calls resolveApproval with denied decision on deny', async () => {
    useApprovalStore.getState().addApproval({
      approvalId: 'a-2',
      sessionId: 's-1',
      taskId: 't-1',
      title: 'Shell command',
      actionSummary: 'Run: rm -rf /',
      riskLevel: 'high',
    } as never);

    render(<ApprovalDialog />);

    fireEvent.click(screen.getByText('Deny'));

    await vi.waitFor(() => {
      expect(mockResolveApproval).toHaveBeenCalledWith({
        approvalId: 'a-2',
        decision: 'denied',
        reason: undefined,
      });
    });
  });

  it('shows error when resolveApproval fails', async () => {
    mockResolveApproval.mockResolvedValueOnce({
      success: false,
      error: { code: 'APPROVAL_ERROR', message: 'Approval timed out' },
    });

    useApprovalStore.getState().addApproval({
      approvalId: 'a-3',
      sessionId: 's-1',
      taskId: 't-1',
      title: 'Network request',
      actionSummary: 'Fetch https://example.com',
      riskLevel: 'medium',
    } as never);

    render(<ApprovalDialog />);

    fireEvent.click(screen.getByText('Approve'));

    await vi.waitFor(() => {
      expect(screen.getByText('Approval timed out')).toBeInTheDocument();
    });

    // Approval should still be in the queue (not resolved)
    expect(useApprovalStore.getState().currentApproval).not.toBeNull();
  });

  it('does not advance queue when IPC throws', async () => {
    mockResolveApproval.mockRejectedValueOnce(new Error('IPC bridge down'));

    useApprovalStore.getState().addApproval({
      approvalId: 'a-4',
      sessionId: 's-1',
      taskId: 't-1',
      title: 'File read',
      actionSummary: 'Read /etc/passwd',
      riskLevel: 'high',
    } as never);

    render(<ApprovalDialog />);

    fireEvent.click(screen.getByText('Approve'));

    await vi.waitFor(() => {
      expect(screen.getByText('IPC bridge down')).toBeInTheDocument();
    });

    expect(useApprovalStore.getState().currentApproval?.approvalId).toBe('a-4');
  });
});
