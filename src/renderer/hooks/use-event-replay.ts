import { useEffect, useRef } from 'react';
import { useSessionStore } from '../state/session-store';
import { useMessagesStore } from '../state/messages-store';
import { dispatchSessionEvent } from './use-session-events';
import type { ConversationMessage, DisplayMessage } from '../../shared/types';

/**
 * Converts ConversationMessage[] from workspace history into DisplayMessage[]
 * for loading into the messages store.
 */
function historyToDisplayMessages(history: ConversationMessage[]): DisplayMessage[] {
  return history.map((msg, index) => ({
    id: `history-${String(index)}`,
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : '',
    timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString(),
  }));
}

/**
 * Hook that replays missed events when the user navigates back to the
 * conversation view for an active session.
 *
 * On mount (when entering conversation view):
 * - If lastSeenEventId > 0 (not a fresh session), calls GetEvents
 * - Dispatches missed events with isReplay=true (skips approval dialogs)
 * - If gapDetected, falls back to loading full history from Workspace Service
 */
export function useEventReplay(): void {
  const isReplaying = useRef(false);

  useEffect(() => {
    const replay = async (): Promise<void> => {
      const { lastSeenEventId, sessionState, isViewingHistory } = useSessionStore.getState();

      // No replay needed for fresh sessions, no active session, or historical views
      if (lastSeenEventId === 0 || !sessionState || isViewingHistory) return;

      // Prevent concurrent replays
      if (isReplaying.current) return;
      isReplaying.current = true;

      try {
        const result = await window.coworkIPC.getEvents({ sinceId: lastSeenEventId });
        if (!result.success) return;

        const data = result.data;

        if (data.gapDetected) {
          // Too many events were missed — fall back to full history reload
          await reloadFullHistory(sessionState.workspaceId, sessionState.sessionId);
          // Update lastSeenEventId to latest so subsequent replays don't re-trigger gap
          if (data.latestId > 0) {
            useSessionStore.getState().setLastSeenEventId(data.latestId);
          }
          return;
        }

        // Dispatch missed events in order, with replay flag
        for (const event of data.events) {
          // Deduplicate: skip events we've already processed
          const currentLastSeen = useSessionStore.getState().lastSeenEventId;
          if (typeof event.eventId === 'number' && event.eventId <= currentLastSeen) {
            continue;
          }
          dispatchSessionEvent(event, { isReplay: true });
        }
      } catch {
        // Replay failure is non-fatal — user just sees slightly stale state
        console.error('[EventReplay] Failed to replay events');
      } finally {
        isReplaying.current = false;
      }
    };

    void replay();
  }, []);
}

/**
 * Loads full session history from Workspace Service and replaces
 * the messages store. Used as a fallback when event buffer overflow
 * causes data loss (gapDetected).
 */
async function reloadFullHistory(workspaceId: string, sessionId: string): Promise<void> {
  try {
    const result = await window.coworkIPC.getSessionHistory({ workspaceId, sessionId });
    if (result.success) {
      const messages = historyToDisplayMessages(result.data);
      useMessagesStore.getState().loadHistory(messages);
    }
  } catch {
    console.error('[EventReplay] Failed to load full history for gap recovery');
  }
}
