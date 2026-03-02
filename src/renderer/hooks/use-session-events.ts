import { useEffect } from 'react';
import type { SessionEvent, ToolCallInfo } from '../../shared/types';
import type { ApprovalRequest } from '../../shared/types';
import { useMessagesStore } from '../state/messages-store';
import { useSessionStore } from '../state/session-store';
import { useApprovalStore } from '../state/approval-store';

/**
 * Event type constants matching the platform SDK EventType values.
 * Defined locally to avoid dependency on SDK sub-path exports.
 */
const EVENT_TYPE = {
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
  LLM_RETRY: 'llm_retry',
} as const;

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

/**
 * Hook that listens for session events from the agent runtime
 * and dispatches them to the appropriate Zustand stores.
 */
export function useSessionEvents(): void {
  const appendTextChunk = useMessagesStore((s) => s.appendTextChunk);
  const finishStreaming = useMessagesStore((s) => s.finishStreaming);
  const addToolCall = useMessagesStore((s) => s.addToolCall);
  const updateToolCall = useMessagesStore((s) => s.updateToolCall);
  const addSystemMessage = useMessagesStore((s) => s.addSystemMessage);

  const updateTaskStep = useSessionStore((s) => s.updateTaskStep);
  const setTaskRunning = useSessionStore((s) => s.setTaskRunning);
  const setError = useSessionStore((s) => s.setError);

  const addApproval = useApprovalStore((s) => s.addApproval);

  useEffect(() => {
    const cleanup = window.coworkIPC.onSessionEvent((event: SessionEvent) => {
      const p = event.payload;

      switch (event.eventType) {
        case EVENT_TYPE.TEXT_CHUNK: {
          const text = typeof p.text === 'string' ? p.text : '';
          appendTextChunk(text);
          break;
        }

        case EVENT_TYPE.STEP_STARTED: {
          if (typeof p.stepNumber === 'number') {
            updateTaskStep(p.stepNumber);
          }
          break;
        }

        case EVENT_TYPE.STEP_COMPLETED: {
          finishStreaming();
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
          addSystemMessage(msg);
          break;
        }

        case EVENT_TYPE.TOOL_REQUESTED: {
          const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : undefined;
          const toolName = typeof p.toolName === 'string' ? p.toolName : undefined;
          if (toolCallId && toolName) {
            const toolCall: ToolCallInfo = {
              id: toolCallId,
              toolName,
              status: 'running',
              arguments:
                typeof p.arguments === 'object' && p.arguments !== null
                  ? (p.arguments as Record<string, unknown>)
                  : undefined,
            };
            addToolCall(toolCall);
          }
          break;
        }

        case EVENT_TYPE.TOOL_COMPLETED: {
          const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : undefined;
          if (toolCallId) {
            updateToolCall(toolCallId, {
              status:
                p.status === 'failed'
                  ? 'failed'
                  : p.status === 'denied'
                    ? 'denied'
                    : 'completed',
              result: typeof p.result === 'string' ? p.result : undefined,
              error: typeof p.error === 'string' ? p.error : undefined,
            });
          }
          break;
        }

        case EVENT_TYPE.APPROVAL_REQUESTED: {
          const approval = parseApprovalRequest(p);
          if (approval) {
            addApproval(approval);
          } else {
            console.error('[SessionEvents] Malformed approval_requested payload:', p);
            addSystemMessage('Received malformed approval request');
          }
          break;
        }

        case EVENT_TYPE.APPROVAL_RESOLVED: {
          // Confirmation that approval was processed by agent-runtime — informational only
          break;
        }

        case EVENT_TYPE.SESSION_COMPLETED: {
          finishStreaming();
          setTaskRunning(false);
          break;
        }

        case EVENT_TYPE.SESSION_FAILED: {
          finishStreaming();
          setTaskRunning(false);
          const message = typeof p.message === 'string' ? p.message : 'Session failed';
          setError(message);
          addSystemMessage(`Error: ${message}`);
          break;
        }

        case EVENT_TYPE.POLICY_EXPIRED: {
          finishStreaming();
          setTaskRunning(false);
          setError('Policy expired. Please start a new session.');
          addSystemMessage('Policy expired. Please start a new session.');
          break;
        }

        case EVENT_TYPE.TASK_COMPLETED: {
          finishStreaming();
          setTaskRunning(false);
          break;
        }

        case EVENT_TYPE.TASK_FAILED: {
          finishStreaming();
          setTaskRunning(false);
          const message = typeof p.message === 'string' ? p.message : 'Task failed';
          setError(message);
          addSystemMessage(`Error: ${message}`);
          break;
        }

        case EVENT_TYPE.LLM_RETRY: {
          const attempt = typeof p.attempt === 'number' ? p.attempt : 0;
          const maxRetries = typeof p.maxRetries === 'number' ? p.maxRetries : 0;
          addSystemMessage(
            `Retrying LLM call (attempt ${String(attempt)}/${String(maxRetries)})...`,
          );
          break;
        }

        default:
          // Unknown event type — ignore
          break;
      }
    });

    return cleanup;
  }, [
    appendTextChunk,
    finishStreaming,
    addToolCall,
    updateToolCall,
    addSystemMessage,
    updateTaskStep,
    setTaskRunning,
    setError,
    addApproval,
  ]);
}
