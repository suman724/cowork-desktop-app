import { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, Loader2, Ban } from 'lucide-react';
import { useSessionStore } from '../../state/session-store';
import type { PlanStepInfo } from '../../../shared/types';

const AUTO_COLLAPSE_THRESHOLD = 7;

function StepIcon({ status }: { status: PlanStepInfo['status'] }): React.JSX.Element {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />;
    case 'in_progress':
      return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />;
    case 'skipped':
      return <Ban className="text-muted-foreground h-3.5 w-3.5 shrink-0" />;
    default:
      return <Circle className="text-muted-foreground h-3.5 w-3.5 shrink-0" />;
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
    <div className="border-b px-4 py-2" data-testid="plan-panel">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-xs font-medium"
        onClick={() => {
          setExpanded((prev) => !prev);
        }}
        data-testid="plan-panel-toggle"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span className="truncate">Plan: {plan.goal}</span>
        <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
          [{completedCount}/{totalCount}]
        </span>
      </button>

      {isExpanded && (
        <ul className="mt-1.5 space-y-0.5" data-testid="plan-step-list">
          {plan.steps.map((step) => (
            <li
              key={step.index}
              className={`flex items-start gap-1.5 text-xs ${
                step.status === 'in_progress'
                  ? 'text-foreground font-medium'
                  : step.status === 'skipped'
                    ? 'text-muted-foreground line-through'
                    : step.status === 'completed'
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground'
              }`}
              data-testid={`plan-step-${String(step.index)}`}
            >
              <StepIcon status={step.status} />
              <span>{step.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
