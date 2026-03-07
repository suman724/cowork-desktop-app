import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionServiceClient } from '../../../src/main/session-client';

describe('SessionServiceClient', () => {
  let client: SessionServiceClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new SessionServiceClient({
      baseUrl: 'http://localhost:8001',
      timeoutMs: 5000,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends PATCH to correct URL with body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    await client.updateSessionName('sess-1', 'My Session', false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8001/sessions/sess-1/name',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ name: 'My Session', autoNamed: false }),
      }),
    );
  });

  it('encodes sessionId in URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await client.updateSessionName('sess/special&id', 'name', false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8001/sessions/sess%2Fspecial%26id/name',
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
      return Promise.resolve({ ok: true, status: 200 });
    });

    await client.updateSessionName('sess-1', 'name', false);
    expect(callCount).toBe(2);
  });

  it('does not retry on 4xx errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    });

    await expect(client.updateSessionName('sess-1', 'name', false)).rejects.toThrow('HTTP 404');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws after all retries exhausted', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    });

    await expect(client.updateSessionName('sess-1', 'name', false)).rejects.toThrow('HTTP 503');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('updates config', async () => {
    client.updateConfig({ baseUrl: 'http://new-host:9001' });

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await client.updateSessionName('sess-1', 'name', false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://new-host:9001/sessions/sess-1/name',
      expect.any(Object),
    );
  });

  it('includes auth token when configured', async () => {
    client.updateConfig({ authToken: 'my-token' });

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await client.updateSessionName('sess-1', 'name', false);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });
});
