import { useEffect } from 'react';
import type { SessionEvent, ToolCallInfo, ToolCallType, PlanStepInfo } from '../../shared/types';
import type { ApprovalRequest } from '../../shared/types';
import { useBrowserStore } from '../state/browser-store';
import { useMessagesStore } from '../state/messages-store';
import { useSessionStore } from '../state/session-store';
import { useApprovalStore } from '../state/approval-store';

/**
 * Event type constants matching the platform SDK EventType values.
 * Defined locally to avoid dependency on SDK sub-path exports.
 */
export const EVENT_TYPE = {
  TEXT_CHUNK: 'text_chunk',
  STEP_STARTED: 'step_started',
  STEP_COMPLETED: 'step_completed',
  STEP_LIMIT_APPROACHING: 'step_limit_approaching',
  TOOL_REQUESTED: 'tool_requested',
  TOOL_COMPLETED: 'tool_completed',
  APPROVAL_REQUESTED: 'approval_requested',
  APPROVAL_RESOLVED: 'approval_resolved',
  SESSION_COMPLETED: 'session_completed',
  SESSION_FAILED: 'session_failed',
  POLICY_EXPIRED: 'policy_expired',
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  TASK_STARTED: 'task_started',
  TASK_CANCELLED: 'task_cancelled',
  LLM_RETRY: 'llm_retry',
  PLAN_MODE_CHANGED: 'plan_mode_changed',
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',
  PLAN_UPDATED: 'plan_updated',
  TOOL_OUTPUT_CHUNK: 'tool_output_chunk',
  // Browser events
  BROWSER_STARTED: 'browser_started',
  BROWSER_STOPPED: 'browser_stopped',
  BROWSER_PAGE_STATE: 'browser_page_state',
  BROWSER_AUTH_REQUIRED: 'browser_auth_required',
  BROWSER_TAKEOVER_STARTED: 'browser_takeover_started',
  BROWSER_TAKEOVER_ENDED: 'browser_takeover_ended',
  BROWSER_DOMAIN_APPROVED: 'browser_domain_approved',
} as const;

const VALID_PLAN_STEP_STATUSES = new Set([
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'failed',
]);

function parsePlanStepStatus(value: unknown): PlanStepInfo['status'] {
  if (typeof value === 'string' && VALID_PLAN_STEP_STATUSES.has(value)) {
    return value as PlanStepInfo['status'];
  }
  return 'pending';
}

/**
 * Runtime validation for ApprovalRequest payloads.
 * Returns a valid ApprovalRequest or null if malformed.
 */
function parseApprovalRequest(payload: Record<string, unknown>): ApprovalRequest | null {
  // Validate all required fields from the ApprovalRequest contract
  if (
    typeof payload.approvalId !== 'string' ||
    typeof payload.sessionId !== 'string' ||
    typeof payload.taskId !== 'string' ||
    typeof payload.title !== 'string' ||
    typeof payload.actionSummary !== 'string'
  ) {
    return null;
  }

  const result: ApprovalRequest = {
    approvalId: payload.approvalId,
    sessionId: payload.sessionId,
    taskId: payload.taskId,
    title: payload.title,
    actionSummary: payload.actionSummary,
  };

  // Optional fields
  if (typeof payload.stepId === 'string') {
    result.stepId = payload.stepId;
  }
  const validRiskLevels = new Set(['low', 'medium', 'high']);
  if (typeof payload.riskLevel === 'string' && validRiskLevels.has(payload.riskLevel)) {
    result.riskLevel = payload.riskLevel as 'low' | 'medium' | 'high';
  }
  if (typeof payload.details === 'object' && payload.details !== null) {
    result.details = payload.details as Record<string, unknown>;
  }

  return result;
}

interface DispatchOptions {
  /** When true, skip side-effect events like approval_requested */
  isReplay?: boolean;
}

/**
 * Dispatches a single session event to the appropriate Zustand stores.
 *
 * Uses .getState() for fresh reads — safe to call from both live event
 * handlers and replay logic without stale closure issues.
 */
export function dispatchSessionEvent(event: SessionEvent, options?: DispatchOptions): void {
  const isReplay = options?.isReplay ?? false;
  const p = event.payload;

  // Track eventId if present (always update to highest seen)
  if (typeof event.eventId === 'number') {
    const current = useSessionStore.getState().lastSeenEventId;
    if (event.eventId > current) {
      useSessionStore.getState().setLastSeenEventId(event.eventId);
    }
  }

  const messagesStore = useMessagesStore.getState();
  const sessionStore = useSessionStore.getState();
  const approvalStore = useApprovalStore.getState();

  switch (event.eventType) {
    case EVENT_TYPE.TEXT_CHUNK: {
      const text = typeof p.text === 'string' ? p.text : '';
      messagesStore.appendTextChunk(text);
      break;
    }

    case EVENT_TYPE.STEP_STARTED: {
      if (typeof p.stepNumber === 'number') {
        sessionStore.updateTaskStep(p.stepNumber);
      }
      break;
    }

    case EVENT_TYPE.STEP_COMPLETED: {
      messagesStore.finishStreaming();
      break;
    }

    case EVENT_TYPE.STEP_LIMIT_APPROACHING: {
      // Warn user that step limit is near (e.g., 80% reached)
      const current = typeof p.currentStep === 'number' ? p.currentStep : undefined;
      const max = typeof p.maxSteps === 'number' ? p.maxSteps : undefined;
      const msg =
        current !== undefined && max !== undefined
          ? `Approaching step limit (${String(current)}/${String(max)})`
          : 'Approaching step limit';
      messagesStore.addSystemMessage(msg, 'warning');
      break;
    }

    case EVENT_TYPE.TOOL_REQUESTED: {
      const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : undefined;
      const toolName = typeof p.toolName === 'string' ? p.toolName : undefined;
      if (toolCallId && toolName) {
        const validToolTypes = new Set<ToolCallType>(['tool', 'agent', 'sub_agent', 'skill']);
        const rawToolType = typeof p.toolType === 'string' ? p.toolType : undefined;
        const toolType: ToolCallType | undefined =
          rawToolType && validToolTypes.has(rawToolType as ToolCallType)
            ? (rawToolType as ToolCallType)
            : undefined;
        const toolCall: ToolCallInfo = {
          id: toolCallId,
          toolName,
          toolType,
          status: 'running',
          arguments:
            typeof p.arguments === 'object' && p.arguments !== null
              ? (p.arguments as Record<string, unknown>)
              : undefined,
        };
        messagesStore.addToolCall(toolCall);
      }
      break;
    }

    case EVENT_TYPE.TOOL_COMPLETED: {
      const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : undefined;
      if (toolCallId) {
        messagesStore.updateToolCall(toolCallId, {
          status: p.status === 'failed' ? 'failed' : p.status === 'denied' ? 'denied' : 'completed',
          result: typeof p.result === 'string' ? p.result : undefined,
          error: typeof p.error === 'string' ? p.error : undefined,
        });
      }
      break;
    }

    case EVENT_TYPE.APPROVAL_REQUESTED: {
      // Skip approval dialogs during replay — if genuinely pending,
      // the live notification stream will deliver it
      if (isReplay) break;

      const approval = parseApprovalRequest(p);
      if (approval) {
        approvalStore.addApproval(approval);
      } else {
        console.error('[SessionEvents] Malformed approval_requested payload:', p);
        messagesStore.addSystemMessage('Received malformed approval request', 'warning');
      }
      break;
    }

    case EVENT_TYPE.APPROVAL_RESOLVED: {
      // Confirmation that approval was processed by agent-runtime — informational only
      break;
    }

    case EVENT_TYPE.SESSION_COMPLETED: {
      messagesStore.finishStreaming();
      sessionStore.setTaskRunning(false);
      break;
    }

    case EVENT_TYPE.SESSION_FAILED: {
      messagesStore.finishStreaming();
      sessionStore.setTaskRunning(false);
      const message = typeof p.message === 'string' ? p.message : 'Session failed';
      sessionStore.setError(message);
      messagesStore.addSystemMessage(`Error: ${message}`, 'error');
      break;
    }

    case EVENT_TYPE.POLICY_EXPIRED: {
      messagesStore.finishStreaming();
      sessionStore.setTaskRunning(false);
      sessionStore.setError('Policy expired. Please start a new session.');
      messagesStore.addSystemMessage('Policy expired. Please start a new session.', 'error');
      break;
    }

    case EVENT_TYPE.TASK_COMPLETED: {
      messagesStore.finishStreaming();
      sessionStore.setTaskRunning(false);
      break;
    }

    case EVENT_TYPE.TASK_STARTED: {
      // Informational — task state is already set by useStartTask
      break;
    }

    case EVENT_TYPE.TASK_CANCELLED: {
      messagesStore.finishStreaming();
      sessionStore.setTaskRunning(false);
      messagesStore.addSystemMessage('Task cancelled', 'info');
      break;
    }

    case EVENT_TYPE.TASK_FAILED: {
      messagesStore.finishStreaming();
      sessionStore.setTaskRunning(false);
      const message = typeof p.message === 'string' ? p.message : 'Task failed';
      sessionStore.setError(message);
      messagesStore.addSystemMessage(`Error: ${message}`, 'error');
      if (p.isRecoverable === true) {
        const taskPrompt = useSessionStore.getState().taskState?.prompt ?? null;
        sessionStore.setLastFailedPrompt(taskPrompt);
      }
      break;
    }

    case EVENT_TYPE.LLM_RETRY: {
      const attempt = typeof p.attempt === 'number' ? p.attempt : 0;
      const maxRetries = typeof p.maxRetries === 'number' ? p.maxRetries : 0;
      messagesStore.addSystemMessage(
        `Retrying LLM call (attempt ${String(attempt)}/${String(maxRetries)})...`,
        'warning',
      );
      break;
    }

    case EVENT_TYPE.PLAN_MODE_CHANGED: {
      const planMode = p.planMode === true;
      sessionStore.setPlanMode(planMode);
      messagesStore.addSystemMessage(
        planMode ? 'Entered plan mode (read-only)' : 'Exited plan mode',
        'info',
      );
      break;
    }

    case EVENT_TYPE.VERIFICATION_STARTED: {
      sessionStore.setVerifying(true);
      messagesStore.addSystemMessage('Verifying results...', 'info');
      break;
    }

    case EVENT_TYPE.VERIFICATION_COMPLETED: {
      sessionStore.setVerifying(false);
      const passed = p.passed === true;
      messagesStore.addSystemMessage(
        passed ? 'Verification passed' : 'Verification found issues',
        passed ? 'info' : 'warning',
      );
      break;
    }

    case EVENT_TYPE.PLAN_UPDATED: {
      const goal = typeof p.goal === 'string' ? p.goal : '';
      const rawSteps = Array.isArray(p.steps) ? (p.steps as unknown[]) : [];
      const steps: PlanStepInfo[] = rawSteps
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map((s) => ({
          index: typeof s.index === 'number' ? s.index : 0,
          description: typeof s.description === 'string' ? s.description : '',
          status: parsePlanStepStatus(s.status),
        }));
      if (goal) {
        sessionStore.setPlan({ goal, steps });
      }
      break;
    }

    // --- Browser events ---

    case EVENT_TYPE.TOOL_OUTPUT_CHUNK: {
      // Streaming tool output — append to current tool card or show inline
      const content = typeof p.content === 'string' ? p.content : '';
      const toolName = typeof p.toolName === 'string' ? p.toolName : '';
      if (content && toolName) {
        messagesStore.appendTextChunk(content);
      }
      break;
    }

    case EVENT_TYPE.BROWSER_STARTED: {
      const browserStore = useBrowserStore.getState();
      browserStore.setBrowserStatus('active');
      browserStore.setPanelOpen(true);
      break;
    }

    case EVENT_TYPE.BROWSER_STOPPED: {
      const browserStore = useBrowserStore.getState();
      browserStore.setBrowserStatus('idle');
      browserStore.updatePageState({ url: '', screenshotBase64: '' });
      break;
    }

    case EVENT_TYPE.BROWSER_PAGE_STATE: {
      const url = typeof p.url === 'string' ? p.url : '';
      const screenshotBase64 = typeof p.screenshotBase64 === 'string' ? p.screenshotBase64 : '';
      if (url || screenshotBase64) {
        const browserStore = useBrowserStore.getState();
        browserStore.updatePageState({ url, screenshotBase64 });
      }
      break;
    }

    case EVENT_TYPE.BROWSER_AUTH_REQUIRED: {
      // Show auth notification — user needs to log in via takeover
      const domain = typeof p.domain === 'string' ? p.domain : '';
      if (domain) {
        const browserStore = useBrowserStore.getState();
        browserStore.setBrowserStatus('takeover');
      }
      break;
    }

    case EVENT_TYPE.BROWSER_TAKEOVER_STARTED: {
      const browserStore = useBrowserStore.getState();
      browserStore.setBrowserStatus('takeover');
      break;
    }

    case EVENT_TYPE.BROWSER_TAKEOVER_ENDED: {
      const browserStore = useBrowserStore.getState();
      browserStore.setBrowserStatus('active');
      break;
    }

    case EVENT_TYPE.BROWSER_DOMAIN_APPROVED: {
      const domain = typeof p.domain === 'string' ? p.domain : '';
      if (domain) {
        const browserStore = useBrowserStore.getState();
        browserStore.addApprovedDomain(domain);
      }
      break;
    }

    default:
      // Unknown event type — ignore
      break;
  }
}

/**
 * Hook that listens for session events from the agent runtime
 * and dispatches them to the appropriate Zustand stores.
 */
export function useSessionEvents(): void {
  useEffect(() => {
    const cleanup = window.coworkIPC.onSessionEvent((event: SessionEvent) => {
      dispatchSessionEvent(event);
    });

    return cleanup;
  }, []);
}
