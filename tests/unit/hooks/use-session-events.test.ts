import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessagesStore } from '../../../src/renderer/state/messages-store';
import { useSessionStore } from '../../../src/renderer/state/session-store';
import type { SessionEvent } from '../../../src/shared/types';

// Capture the event handler registered via onSessionEvent
let eventHandler: ((event: SessionEvent) => void) | null = null;
const mockCleanup = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: {
    onSessionEvent: vi.fn((handler: (event: SessionEvent) => void) => {
      eventHandler = handler;
      return mockCleanup;
    }),
    onRuntimeStatusChanged: vi.fn(() => vi.fn()),
    onRuntimeCrashed: vi.fn(() => vi.fn()),
  },
  writable: true,
  configurable: true,
});

// Import hook and dispatch function AFTER mocking IPC
import {
  useSessionEvents,
  dispatchSessionEvent,
} from '../../../src/renderer/hooks/use-session-events';
import { useApprovalStore } from '../../../src/renderer/state/approval-store';

function fireEvent(
  eventType: string,
  payload: Record<string, unknown> = {},
  eventId?: number,
): void {
  if (!eventHandler) throw new Error('No event handler registered');
  eventHandler({ eventType, sessionId: 'sess-1', payload, eventId });
}

describe('useSessionEvents — severity propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandler = null;
    useMessagesStore.getState().clear();
    useSessionStore.getState().reset();
  });

  function setup(): void {
    renderHook(() => useSessionEvents());
  }

  it('TASK_FAILED passes severity=error to addSystemMessage', () => {
    setup();

    act(() => {
      fireEvent('task_failed', { message: 'Rate limited' });
    });

    // Check the message was stored with error severity
    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg).toBeDefined();
    expect(systemMsg?.severity).toBe('error');
    expect(systemMsg?.content).toContain('Rate limited');
  });

  it('SESSION_FAILED passes severity=error to addSystemMessage', () => {
    setup();

    act(() => {
      fireEvent('session_failed', { message: 'Session expired' });
    });

    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('error');
  });

  it('POLICY_EXPIRED passes severity=error to addSystemMessage', () => {
    setup();

    act(() => {
      fireEvent('policy_expired', {});
    });

    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('error');
    expect(systemMsg?.content).toContain('Policy expired');
  });

  it('LLM_RETRY passes severity=warning to addSystemMessage', () => {
    setup();

    act(() => {
      fireEvent('llm_retry', { attempt: 1, maxRetries: 3 });
    });

    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('warning');
    expect(systemMsg?.content).toContain('Retrying');
  });

  it('STEP_LIMIT_APPROACHING passes severity=warning to addSystemMessage', () => {
    setup();

    act(() => {
      fireEvent('step_limit_approaching', { currentStep: 40, maxSteps: 50 });
    });

    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('warning');
    expect(systemMsg?.content).toContain('step limit');
  });

  it('malformed approval_requested passes severity=warning', () => {
    setup();

    act(() => {
      // Missing required fields → malformed
      fireEvent('approval_requested', { approvalId: 'a-1' });
    });

    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('warning');
    expect(systemMsg?.content).toContain('malformed');
  });

  it('TASK_FAILED with isRecoverable sets lastFailedPrompt', () => {
    // Set up a task state so the prompt is available
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 'sess-1',
      prompt: 'explain quantum computing',
      currentStep: 1,
      maxSteps: 40,
      isRunning: true,
    });
    setup();

    act(() => {
      fireEvent('task_failed', { message: 'LLM overloaded', isRecoverable: true });
    });

    expect(useSessionStore.getState().lastFailedPrompt).toBe('explain quantum computing');
  });

  it('TASK_FAILED without isRecoverable does not set lastFailedPrompt', () => {
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 'sess-1',
      prompt: 'explain quantum computing',
      currentStep: 1,
      maxSteps: 40,
      isRunning: true,
    });
    setup();

    act(() => {
      fireEvent('task_failed', { message: 'Permanent error' });
    });

    expect(useSessionStore.getState().lastFailedPrompt).toBeNull();
  });

  it('TASK_FAILED with isRecoverable=false does not set lastFailedPrompt', () => {
    useSessionStore.getState().setTaskState({
      taskId: 't-1',
      sessionId: 'sess-1',
      prompt: 'explain quantum computing',
      currentStep: 1,
      maxSteps: 40,
      isRunning: true,
    });
    setup();

    act(() => {
      fireEvent('task_failed', { message: 'Permanent error', isRecoverable: false });
    });

    expect(useSessionStore.getState().lastFailedPrompt).toBeNull();
  });

  it('PLAN_MODE_CHANGED sets planMode and adds system message', () => {
    setup();

    act(() => {
      fireEvent('plan_mode_changed', { planMode: true });
    });

    expect(useSessionStore.getState().planMode).toBe(true);
    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('info');
    expect(systemMsg?.content).toContain('plan mode');
  });

  it('PLAN_MODE_CHANGED exit sets planMode false', () => {
    useSessionStore.getState().setPlanMode(true);
    setup();

    act(() => {
      fireEvent('plan_mode_changed', { planMode: false });
    });

    expect(useSessionStore.getState().planMode).toBe(false);
    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Exited plan mode');
  });

  it('VERIFICATION_STARTED sets isVerifying and adds system message', () => {
    setup();

    act(() => {
      fireEvent('verification_started', {});
    });

    expect(useSessionStore.getState().isVerifying).toBe(true);
    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Verifying');
  });

  it('VERIFICATION_COMPLETED with passed=true clears isVerifying', () => {
    useSessionStore.getState().setVerifying(true);
    setup();

    act(() => {
      fireEvent('verification_completed', { passed: true });
    });

    expect(useSessionStore.getState().isVerifying).toBe(false);
    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('info');
    expect(systemMsg?.content).toContain('passed');
  });

  it('VERIFICATION_COMPLETED with passed=false shows warning', () => {
    useSessionStore.getState().setVerifying(true);
    setup();

    act(() => {
      fireEvent('verification_completed', { passed: false });
    });

    expect(useSessionStore.getState().isVerifying).toBe(false);
    const messages = useMessagesStore.getState().messages;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.severity).toBe('warning');
    expect(systemMsg?.content).toContain('issues');
  });

  it('system messages without explicit severity default to undefined', () => {
    // Verify that TEXT_CHUNK does not create system messages
    setup();

    act(() => {
      fireEvent('text_chunk', { text: 'Hello' });
    });

    const messages = useMessagesStore.getState().messages;
    const systemMsgs = messages.filter((m) => m.role === 'system');
    expect(systemMsgs).toHaveLength(0);
  });

  it('tracks eventId from live events and updates lastSeenEventId', () => {
    setup();

    act(() => {
      fireEvent('text_chunk', { text: 'A' }, 1);
      fireEvent('text_chunk', { text: 'B' }, 2);
      fireEvent('text_chunk', { text: 'C' }, 3);
    });

    expect(useSessionStore.getState().lastSeenEventId).toBe(3);
  });

  it('does not decrease lastSeenEventId on out-of-order events', () => {
    setup();

    act(() => {
      fireEvent('text_chunk', { text: 'A' }, 5);
      fireEvent('text_chunk', { text: 'B' }, 3); // out of order
    });

    expect(useSessionStore.getState().lastSeenEventId).toBe(5);
  });

  it('handles events without eventId gracefully', () => {
    setup();

    act(() => {
      fireEvent('text_chunk', { text: 'A' }); // no eventId
    });

    // Should not crash, lastSeenEventId stays at 0
    expect(useSessionStore.getState().lastSeenEventId).toBe(0);
    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
  });
});

describe('dispatchSessionEvent — replay mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMessagesStore.getState().clear();
    useSessionStore.getState().reset();
    useApprovalStore.getState().clear();
  });

  it('skips approval_requested during replay', () => {
    dispatchSessionEvent(
      {
        eventType: 'approval_requested',
        sessionId: 'sess-1',
        eventId: 10,
        payload: {
          approvalId: 'a-1',
          sessionId: 'sess-1',
          taskId: 't-1',
          title: 'Delete file',
          actionSummary: 'rm file',
        },
      },
      { isReplay: true },
    );

    expect(useApprovalStore.getState().pendingApprovals).toHaveLength(0);
  });

  it('processes non-approval events during replay', () => {
    dispatchSessionEvent(
      {
        eventType: 'text_chunk',
        sessionId: 'sess-1',
        eventId: 10,
        payload: { text: 'replayed text' },
      },
      { isReplay: true },
    );

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe('replayed text');
  });

  it('updates lastSeenEventId during replay', () => {
    dispatchSessionEvent(
      {
        eventType: 'text_chunk',
        sessionId: 'sess-1',
        eventId: 42,
        payload: { text: 'text' },
      },
      { isReplay: true },
    );

    expect(useSessionStore.getState().lastSeenEventId).toBe(42);
  });
});
