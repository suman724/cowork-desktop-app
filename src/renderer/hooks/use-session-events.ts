import { useEffect } from 'react';
import type { SessionEvent, ToolCallInfo } from '../../shared/types';

/**
 * Event type constants matching the platform SDK EventType values.
 * Defined locally to avoid dependency on SDK sub-path exports.
 */
const EVENT_TYPE = {
  TEXT_CHUNK: 'text_chunk',
  STEP_STARTED: 'step_started',
  STEP_COMPLETED: 'step_completed',
  TOOL_REQUESTED: 'tool_requested',
  TOOL_COMPLETED: 'tool_completed',
  APPROVAL_REQUESTED: 'approval_requested',
  SESSION_COMPLETED: 'session_completed',
  SESSION_FAILED: 'session_failed',
  POLICY_EXPIRED: 'policy_expired',
} as const;
import { useMessagesStore } from '../state/messages-store';
import { useSessionStore } from '../state/session-store';
import { useApprovalStore } from '../state/approval-store';
import type { ApprovalRequest } from '../../shared/types';

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
      switch (event.eventType) {
        case EVENT_TYPE.TEXT_CHUNK: {
          const text = (event.payload as { text?: string }).text ?? '';
          appendTextChunk(text);
          break;
        }

        case EVENT_TYPE.STEP_STARTED: {
          const stepNumber = (event.payload as { stepNumber?: number }).stepNumber;
          if (typeof stepNumber === 'number') {
            updateTaskStep(stepNumber);
          }
          break;
        }

        case EVENT_TYPE.STEP_COMPLETED: {
          finishStreaming();
          break;
        }

        case EVENT_TYPE.TOOL_REQUESTED: {
          const payload = event.payload as {
            toolCallId?: string;
            toolName?: string;
            arguments?: Record<string, unknown>;
          };
          if (payload.toolCallId && payload.toolName) {
            const toolCall: ToolCallInfo = {
              id: payload.toolCallId,
              toolName: payload.toolName,
              status: 'running',
              arguments: payload.arguments,
            };
            addToolCall(toolCall);
          }
          break;
        }

        case EVENT_TYPE.TOOL_COMPLETED: {
          const payload = event.payload as {
            toolCallId?: string;
            status?: string;
            result?: string;
            error?: string;
          };
          if (payload.toolCallId) {
            updateToolCall(payload.toolCallId, {
              status: payload.status === 'failed' ? 'failed' : 'completed',
              result: payload.result,
              error: payload.error,
            });
          }
          break;
        }

        case EVENT_TYPE.APPROVAL_REQUESTED: {
          const approval = event.payload as unknown as ApprovalRequest;
          addApproval(approval);
          break;
        }

        case EVENT_TYPE.SESSION_COMPLETED: {
          finishStreaming();
          setTaskRunning(false);
          addSystemMessage('Session completed.');
          break;
        }

        case EVENT_TYPE.SESSION_FAILED: {
          finishStreaming();
          setTaskRunning(false);
          const message = (event.payload as { message?: string }).message ?? 'Session failed';
          setError(message);
          addSystemMessage(`Error: ${message}`);
          break;
        }

        case EVENT_TYPE.POLICY_EXPIRED: {
          setError('Policy expired. Please start a new session.');
          addSystemMessage('Policy expired. Please start a new session.');
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
