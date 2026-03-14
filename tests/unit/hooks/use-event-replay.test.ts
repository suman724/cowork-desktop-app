import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionStore } from '../../../src/renderer/state/session-store';
import { useMessagesStore } from '../../../src/renderer/state/messages-store';
import { useApprovalStore } from '../../../src/renderer/state/approval-store';
import type { SessionEvent } from '../../../src/shared/types';

const mockGetEvents = vi.fn();
const mockGetSessionHistory = vi.fn();
const mockOnSessionEvent = vi.fn(() => vi.fn());
const mockOnRuntimeStatusChanged = vi.fn(() => vi.fn());
const mockOnRuntimeCrashed = vi.fn(() => vi.fn());

Object.defineProperty(window, 'coworkIPC', {
  value: {
    getEvents: mockGetEvents,
    getSessionHistory: mockGetSessionHistory,
    onSessionEvent: mockOnSessionEvent,
    onRuntimeStatusChanged: mockOnRuntimeStatusChanged,
    onRuntimeCrashed: mockOnRuntimeCrashed,
  },
  writable: true,
  configurable: true,
});

// Import after mocking IPC
import { useEventReplay } from '../../../src/renderer/hooks/use-event-replay';

function makeEvent(
  eventId: number,
  eventType: string,
  payload: Record<string, unknown> = {},
): SessionEvent {
  return { eventId, eventType, sessionId: 'sess-1', payload };
}

describe('useEventReplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
    useMessagesStore.getState().clear();
    useApprovalStore.getState().clear();
  });

  it('does not replay when lastSeenEventId is 0 (fresh session)', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    // lastSeenEventId defaults to 0

    renderHook(() => useEventReplay());
    await vi.waitFor(() => {
      // Should not have called getEvents
      expect(mockGetEvents).not.toHaveBeenCalled();
    });
  });

  it('does not replay when no active session', async () => {
    useSessionStore.getState().setLastSeenEventId(10);
    // sessionState is null

    renderHook(() => useEventReplay());
    await vi.waitFor(() => {
      expect(mockGetEvents).not.toHaveBeenCalled();
    });
  });

  it('does not replay when viewing history', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    useSessionStore.getState().setLastSeenEventId(10);
    useSessionStore.getState().setViewingHistory(true);

    renderHook(() => useEventReplay());
    await vi.waitFor(() => {
      expect(mockGetEvents).not.toHaveBeenCalled();
    });
  });

  it('replays missed events and updates lastSeenEventId', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    useSessionStore.getState().setLastSeenEventId(5);

    mockGetEvents.mockResolvedValueOnce({
      success: true,
      data: {
        events: [
          makeEvent(6, 'text_chunk', { text: 'Hello ' }),
          makeEvent(7, 'text_chunk', { text: 'world' }),
          makeEvent(8, 'step_completed', {}),
        ],
        gapDetected: false,
        latestId: 8,
      },
    });

    renderHook(() => useEventReplay());

    await vi.waitFor(() => {
      expect(mockGetEvents).toHaveBeenCalledWith({ sinceId: 5 });
    });

    await vi.waitFor(() => {
      // Events should have been dispatched
      const messages = useMessagesStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);
      // lastSeenEventId should be updated to 8
      expect(useSessionStore.getState().lastSeenEventId).toBe(8);
    });
  });

  it('skips approval_requested events during replay', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    useSessionStore.getState().setLastSeenEventId(5);

    mockGetEvents.mockResolvedValueOnce({
      success: true,
      data: {
        events: [
          makeEvent(6, 'approval_requested', {
            approvalId: 'a-1',
            sessionId: 'sess-1',
            taskId: 't-1',
            title: 'Delete file',
            actionSummary: 'rm -rf /',
          }),
        ],
        gapDetected: false,
        latestId: 6,
      },
    });

    renderHook(() => useEventReplay());

    await vi.waitFor(() => {
      expect(mockGetEvents).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      // Approval should NOT have been added to the queue
      expect(useApprovalStore.getState().pendingApprovals).toHaveLength(0);
    });
  });

  it('falls back to full history reload on gapDetected', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    useSessionStore.getState().setLastSeenEventId(5);

    mockGetEvents.mockResolvedValueOnce({
      success: true,
      data: {
        events: [],
        gapDetected: true,
        latestId: 5000,
      },
    });

    mockGetSessionHistory.mockResolvedValueOnce({
      success: true,
      data: [
        {
          messageId: 'm-1',
          sessionId: 'sess-1',
          taskId: 't-1',
          role: 'user',
          content: 'hello',
          timestamp: '2026-01-01T00:00:00Z',
        },
        {
          messageId: 'm-2',
          sessionId: 'sess-1',
          taskId: 't-1',
          role: 'assistant',
          content: 'hi there',
          timestamp: '2026-01-01T00:00:01Z',
        },
      ],
    });

    renderHook(() => useEventReplay());

    await vi.waitFor(() => {
      expect(mockGetSessionHistory).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        sessionId: 'sess-1',
      });
    });

    await vi.waitFor(() => {
      // Messages should be loaded from history
      const messages = useMessagesStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('user');
      expect(messages[1]?.role).toBe('assistant');
      // lastSeenEventId should jump to latestId
      expect(useSessionStore.getState().lastSeenEventId).toBe(5000);
    });
  });

  it('deduplicates events already processed by live stream', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    useSessionStore.getState().setLastSeenEventId(5);

    // Simulate: event 6 arrives live before replay completes
    // The replay also includes event 6 — it should be skipped
    mockGetEvents.mockImplementation(async () => {
      // Simulate live event arriving and advancing lastSeenEventId to 7
      useSessionStore.getState().setLastSeenEventId(7);
      return {
        success: true as const,
        data: {
          events: [
            makeEvent(6, 'text_chunk', { text: 'dup' }),
            makeEvent(7, 'text_chunk', { text: 'also dup' }),
            makeEvent(8, 'text_chunk', { text: 'new' }),
          ],
          gapDetected: false,
          latestId: 8,
        },
      };
    });

    renderHook(() => useEventReplay());

    await vi.waitFor(() => {
      expect(mockGetEvents).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      // Only event 8 should be dispatched (6 and 7 are deduped)
      const messages = useMessagesStore.getState().messages;
      const assistantMsgs = messages.filter((m) => m.role === 'assistant');
      expect(assistantMsgs).toHaveLength(1);
      expect(assistantMsgs[0]?.content).toBe('new');
    });
  });

  it('handles getEvents failure gracefully', async () => {
    useSessionStore.getState().setSessionState({
      sessionId: 'sess-1',
      workspaceId: 'ws-1',
      status: 'SESSION_RUNNING',
    });
    useSessionStore.getState().setLastSeenEventId(5);

    mockGetEvents.mockResolvedValueOnce({
      success: false,
      error: { code: 'RUNTIME_NOT_AVAILABLE', message: 'Not running' },
    });

    // Should not throw
    renderHook(() => useEventReplay());

    await vi.waitFor(() => {
      expect(mockGetEvents).toHaveBeenCalled();
    });

    // State should be unchanged
    expect(useSessionStore.getState().lastSeenEventId).toBe(5);
  });
});
