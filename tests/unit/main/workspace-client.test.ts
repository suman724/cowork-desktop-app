import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkspaceServiceClient } from '../../../src/main/workspace-client';

describe('WorkspaceServiceClient', () => {
  let client: WorkspaceServiceClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new WorkspaceServiceClient({
      baseUrl: 'http://localhost:8003',
      timeoutMs: 5000,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches workspaces with correct URL', async () => {
    const mockWorkspaces = [{ workspaceId: 'ws-1', tenantId: 't-1' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWorkspaces),
    });

    const result = await client.listWorkspaces('t-1', 'u-1');

    expect(result).toEqual(mockWorkspaces);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8003/workspaces?tenantId=t-1&userId=u-1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('fetches sessions for a workspace', async () => {
    const mockSessions = [
      { sessionId: 'sess-1', createdAt: '2026-01-01', lastTaskAt: '2026-01-01', taskCount: 1 },
    ];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: mockSessions }),
    });

    const result = await client.listSessions('ws-1');

    expect(result).toEqual(mockSessions);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8003/workspaces/ws-1/sessions?limit=100',
      expect.any(Object),
    );
  });

  it('fetches session history', async () => {
    const mockMessages = [{ messageId: 'msg-1', role: 'user', content: 'hello' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMessages),
    });

    const result = await client.getSessionHistory('ws-1', 'sess-1');

    expect(result).toEqual(mockMessages);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8003/workspaces/ws-1/sessions/sess-1/history',
      expect.any(Object),
    );
  });

  it('retries on server error', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    const result = await client.listWorkspaces('t-1', 'u-1');
    expect(result).toEqual([]);
    expect(callCount).toBe(2);
  });

  it('does not retry on 4xx errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    });

    await expect(client.listWorkspaces('t-1', 'u-1')).rejects.toThrow('HTTP 404');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws after all retries exhausted', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    });

    await expect(client.listWorkspaces('t-1', 'u-1')).rejects.toThrow('HTTP 503');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2); // maxRetries = 2
  });

  it('updates config', async () => {
    client.updateConfig({ baseUrl: 'http://new-host:9000' });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await client.listWorkspaces('t-1', 'u-1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://new-host:9000/workspaces?tenantId=t-1&userId=u-1',
      expect.any(Object),
    );
  });
});
