import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../components/ui/alert-dialog';
import { Textarea } from '../../components/ui/textarea';
import { RiskLevelBadge } from './RiskLevelBadge';
import { useApprovalStore } from '../../state/approval-store';

export function ApprovalDialog(): React.JSX.Element {
  const currentApproval = useApprovalStore((s) => s.currentApproval);
  const resolveCurrentApproval = useApprovalStore((s) => s.resolveCurrentApproval);
  const [reason, setReason] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleDecision = useCallback(
    async (decision: 'approved' | 'denied') => {
      if (!currentApproval) return;

      setError(null);
      try {
        const result = await window.coworkIPC.resolveApproval({
          approvalId: currentApproval.approvalId,
          decision,
          reason: reason.trim() || undefined,
        });

        if (result.success) {
          setReason('');
          resolveCurrentApproval();
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve approval');
      }
    },
    [currentApproval, reason, resolveCurrentApproval],
  );

  if (!currentApproval) return <></>;

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertDialogTitle>Approval Required</AlertDialogTitle>
            <RiskLevelBadge riskLevel={currentApproval.riskLevel ?? 'medium'} />
          </div>
          <AlertDialogDescription>{currentApproval.title}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="bg-muted rounded-md p-3 text-sm">{currentApproval.actionSummary}</div>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason..."
            rows={2}
            className="resize-none"
          />

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void handleDecision('denied')}>Deny</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleDecision('approved')}>
            Approve
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
