import { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, Loader2, Ban } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { useSessionStore } from '../../state/session-store';
import type { PlanStepInfo } from '../../../shared/types';

const AUTO_COLLAPSE_THRESHOLD = 7;

function StepIcon({ status }: { status: PlanStepInfo['status'] }): React.JSX.Element {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />;
    case 'skipped':
      return <Ban className="text-muted-foreground h-4 w-4 shrink-0" />;
    default:
      return <Circle className="text-muted-foreground/50 h-4 w-4 shrink-0" />;
  }
}

function stepClassName(status: PlanStepInfo['status']): string {
  switch (status) {
    case 'in_progress':
      return 'text-foreground font-medium';
    case 'completed':
      return 'text-foreground/70';
    case 'skipped':
      return 'text-muted-foreground line-through';
    default:
      return 'text-muted-foreground';
  }
}

export function PlanPanel(): React.JSX.Element | null {
  const plan = useSessionStore((s) => s.plan);
  const [expanded, setExpanded] = useState(true);

  if (!plan) return null;

  const completedCount = plan.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped',
  ).length;
  const totalCount = plan.steps.length;
  const autoCollapse = totalCount >= AUTO_COLLAPSE_THRESHOLD;
  const isExpanded = autoCollapse ? expanded : expanded;

  return (
    <div className="border-b px-6 py-3" data-testid="plan-panel">
      <div className="bg-muted/50 rounded-lg px-4 py-3">
        <button
          type="button"
          className="hover:text-foreground flex w-full items-center gap-2 text-sm font-medium"
          onClick={() => {
            setExpanded((prev) => !prev);
          }}
          data-testid="plan-panel-toggle"
        >
          {isExpanded ? (
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
          <span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-wider uppercase">
            Plan
          </span>
          <span className="min-w-0 truncate">{plan.goal}</span>
          <Badge variant="secondary" className="ml-auto shrink-0 tabular-nums">
            {completedCount}/{totalCount}
          </Badge>
        </button>

        {isExpanded && (
          <ul className="mt-3 space-y-1.5 pl-6" data-testid="plan-step-list">
            {plan.steps.map((step) => (
              <li
                key={step.index}
                className={`flex items-start gap-2 text-[13px] leading-snug ${stepClassName(step.status)}`}
                data-testid={`plan-step-${String(step.index)}`}
              >
                <StepIcon status={step.status} />
                <span className="pt-px">{step.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
