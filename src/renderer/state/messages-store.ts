import { create } from 'zustand';
import type { DisplayMessage, ToolCallInfo } from '../../shared/types';

interface MessagesStore {
  messages: DisplayMessage[];

  /** Cache of messages by sessionId — survives clear() */
  sessionMessageCache: Record<string, DisplayMessage[]>;

  /** Append a text chunk to the current streaming assistant message (or create one) */
  appendTextChunk: (text: string) => void;

  /** Add a user message */
  addUserMessage: (content: string) => void;

  /** Add a system message */
  addSystemMessage: (content: string) => void;

  /** Finish streaming the current assistant message */
  finishStreaming: () => void;

  /** Add a tool call card to the current assistant message */
  addToolCall: (toolCall: ToolCallInfo) => void;

  /** Update a tool call status */
  updateToolCall: (toolCallId: string, update: Partial<ToolCallInfo>) => void;

  /** Load historical messages */
  loadHistory: (messages: DisplayMessage[]) => void;

  /** Save current messages to cache under a sessionId */
  cacheMessages: (sessionId: string) => void;

  /** Restore messages from cache. Returns true if cache hit. */
  restoreFromCache: (sessionId: string) => boolean;

  /** Clear all messages (does NOT clear cache) */
  clear: () => void;
}

let messageCounter = 0;

function nextId(): string {
  return `msg-${++messageCounter}`;
}

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  messages: [],
  sessionMessageCache: {},

  appendTextChunk: (text) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];

      if (last && last.role === 'assistant' && last.isStreaming) {
        // Append to existing streaming message
        messages[messages.length - 1] = {
          ...last,
          content: last.content + text,
        };
      } else {
        // Create new streaming assistant message
        messages.push({
          id: nextId(),
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
          isStreaming: true,
          toolCalls: [],
        });
      }

      return { messages };
    }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: nextId(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  addSystemMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: nextId(),
          role: 'system',
          content,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  finishStreaming: () =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant' && last.isStreaming) {
        messages[messages.length - 1] = { ...last, isStreaming: false };
      }
      return { messages };
    }),

  addToolCall: (toolCall) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];

      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          toolCalls: [...(last.toolCalls ?? []), toolCall],
        };
      } else {
        // Create a new assistant message to hold the tool call
        messages.push({
          id: nextId(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true,
          toolCalls: [toolCall],
        });
      }

      return { messages };
    }),

  updateToolCall: (toolCallId, update) =>
    set((state) => {
      // Find which message contains this tool call
      const msgIndex = state.messages.findIndex(
        (msg) => msg.role === 'assistant' && msg.toolCalls?.some((tc) => tc.id === toolCallId),
      );
      if (msgIndex === -1) return {};

      const msg = state.messages[msgIndex];
      if (!msg || !msg.toolCalls) return {};

      const updatedCalls = msg.toolCalls.map((tc) =>
        tc.id === toolCallId ? { ...tc, ...update } : tc,
      );

      const messages = [...state.messages];
      messages[msgIndex] = { ...msg, toolCalls: updatedCalls };
      return { messages };
    }),

  loadHistory: (messages) => {
    messageCounter = 0;
    set({ messages });
  },

  cacheMessages: (sessionId) => {
    const { messages, sessionMessageCache } = get();
    if (messages.length > 0) {
      set({ sessionMessageCache: { ...sessionMessageCache, [sessionId]: [...messages] } });
    }
  },

  restoreFromCache: (sessionId) => {
    const cached = get().sessionMessageCache[sessionId];
    if (cached && cached.length > 0) {
      set({ messages: [...cached] });
      return true;
    }
    return false;
  },

  clear: () => {
    messageCounter = 0;
    set({ messages: [] });
  },
}));
