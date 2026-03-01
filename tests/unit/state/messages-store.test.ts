import { describe, it, expect, beforeEach } from 'vitest';
import { useMessagesStore } from '../../../src/renderer/state/messages-store';

describe('useMessagesStore', () => {
  beforeEach(() => {
    useMessagesStore.getState().clear();
  });

  it('starts with empty messages', () => {
    expect(useMessagesStore.getState().messages).toEqual([]);
  });

  it('adds a user message', () => {
    useMessagesStore.getState().addUserMessage('Hello');

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('user');
    expect(messages[0]?.content).toBe('Hello');
  });

  it('adds a system message', () => {
    useMessagesStore.getState().addSystemMessage('System info');

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('system');
  });

  it('creates a streaming assistant message on first text chunk', () => {
    useMessagesStore.getState().appendTextChunk('Hello');

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('assistant');
    expect(messages[0]?.content).toBe('Hello');
    expect(messages[0]?.isStreaming).toBe(true);
  });

  it('appends text chunks to existing streaming message', () => {
    useMessagesStore.getState().appendTextChunk('Hello');
    useMessagesStore.getState().appendTextChunk(' world');

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe('Hello world');
    expect(messages[0]?.isStreaming).toBe(true);
  });

  it('finishes streaming', () => {
    useMessagesStore.getState().appendTextChunk('Done');
    useMessagesStore.getState().finishStreaming();

    const messages = useMessagesStore.getState().messages;
    expect(messages[0]?.isStreaming).toBe(false);
  });

  it('creates new streaming message after finishing previous', () => {
    useMessagesStore.getState().appendTextChunk('First');
    useMessagesStore.getState().finishStreaming();
    useMessagesStore.getState().appendTextChunk('Second');

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toBe('First');
    expect(messages[0]?.isStreaming).toBe(false);
    expect(messages[1]?.content).toBe('Second');
    expect(messages[1]?.isStreaming).toBe(true);
  });

  it('adds a tool call to current assistant message', () => {
    useMessagesStore.getState().appendTextChunk('Running tool...');
    useMessagesStore.getState().addToolCall({
      id: 'tc-1',
      toolName: 'ReadFile',
      status: 'running',
    });

    const messages = useMessagesStore.getState().messages;
    expect(messages[0]?.toolCalls).toHaveLength(1);
    expect(messages[0]?.toolCalls?.[0]?.toolName).toBe('ReadFile');
  });

  it('updates a tool call status', () => {
    useMessagesStore.getState().appendTextChunk('...');
    useMessagesStore.getState().addToolCall({
      id: 'tc-1',
      toolName: 'ReadFile',
      status: 'running',
    });
    useMessagesStore.getState().updateToolCall('tc-1', {
      status: 'completed',
      result: 'file contents',
    });

    const messages = useMessagesStore.getState().messages;
    expect(messages[0]?.toolCalls?.[0]?.status).toBe('completed');
    expect(messages[0]?.toolCalls?.[0]?.result).toBe('file contents');
  });

  it('loads historical messages', () => {
    const history = [
      { id: 'h-1', role: 'user' as const, content: 'Hi', timestamp: '2026-01-01' },
      { id: 'h-2', role: 'assistant' as const, content: 'Hello!', timestamp: '2026-01-01' },
    ];
    useMessagesStore.getState().loadHistory(history);

    expect(useMessagesStore.getState().messages).toEqual(history);
  });

  it('clears all messages', () => {
    useMessagesStore.getState().addUserMessage('test');
    useMessagesStore.getState().clear();
    expect(useMessagesStore.getState().messages).toEqual([]);
  });

  // --- Edge case tests ---

  it('adds tool call when no assistant message exists', () => {
    // Tool requested before any text chunk — should create an assistant message
    useMessagesStore.getState().addToolCall({
      id: 'tc-1',
      toolName: 'Shell.Exec',
      status: 'running',
    });

    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('assistant');
    expect(messages[0]?.isStreaming).toBe(true);
    expect(messages[0]?.toolCalls).toHaveLength(1);
  });

  it('updateToolCall ignores unknown tool call ID', () => {
    useMessagesStore.getState().appendTextChunk('test');
    useMessagesStore
      .getState()
      .addToolCall({ id: 'tc-1', toolName: 'ReadFile', status: 'running' });

    // Update with unknown ID — should be a no-op
    useMessagesStore.getState().updateToolCall('tc-nonexistent', { status: 'completed' });

    const messages = useMessagesStore.getState().messages;
    expect(messages[0]?.toolCalls?.[0]?.status).toBe('running');
  });

  it('loadHistory resets message counter', () => {
    // Generate some messages to advance the counter
    useMessagesStore.getState().addUserMessage('msg1');
    useMessagesStore.getState().addUserMessage('msg2');

    // Load history resets counter
    useMessagesStore
      .getState()
      .loadHistory([{ id: 'h-1', role: 'user', content: 'Hi', timestamp: '2026-01-01' }]);

    // New message should start from msg-1 again
    useMessagesStore.getState().addUserMessage('after history');
    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[1]?.id).toBe('msg-1');
  });

  it('finishStreaming is a no-op when no streaming message exists', () => {
    useMessagesStore.getState().addUserMessage('user msg');
    useMessagesStore.getState().finishStreaming();

    // Should not crash or modify anything
    const messages = useMessagesStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('user');
  });

  it('handles multiple tool calls on one assistant message', () => {
    useMessagesStore.getState().appendTextChunk('Let me check...');
    useMessagesStore
      .getState()
      .addToolCall({ id: 'tc-1', toolName: 'ReadFile', status: 'running' });
    useMessagesStore
      .getState()
      .addToolCall({ id: 'tc-2', toolName: 'Shell.Exec', status: 'running' });
    useMessagesStore.getState().updateToolCall('tc-1', { status: 'completed', result: 'done' });

    const messages = useMessagesStore.getState().messages;
    expect(messages[0]?.toolCalls).toHaveLength(2);
    expect(messages[0]?.toolCalls?.[0]?.status).toBe('completed');
    expect(messages[0]?.toolCalls?.[1]?.status).toBe('running');
  });
});
