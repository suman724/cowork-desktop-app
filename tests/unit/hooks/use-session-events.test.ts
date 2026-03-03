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

// Import hook AFTER mocking IPC
import { useSessionEvents } from '../../../src/renderer/hooks/use-session-events';

function fireEvent(eventType: string, payload: Record<string, unknown> = {}): void {
  if (!eventHandler) throw new Error('No event handler registered');
  eventHandler({ eventType, sessionId: 'sess-1', payload });
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
});
