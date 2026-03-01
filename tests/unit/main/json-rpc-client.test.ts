import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { JsonRpcClient } from '../../../src/main/json-rpc-client';

describe('JsonRpcClient', () => {
  let input: PassThrough;
  let output: PassThrough;
  let client: JsonRpcClient;

  beforeEach(() => {
    input = new PassThrough();
    output = new PassThrough();
    output.setEncoding('utf8');
    client = new JsonRpcClient(input, output, 5000);
  });

  afterEach(() => {
    client.close();
    input.destroy();
    output.destroy();
  });

  it('sends a valid JSON-RPC request', async () => {
    const chunks: string[] = [];
    output.on('data', (chunk: string) => chunks.push(chunk));

    // Respond async
    setTimeout(() => {
      input.write('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n');
    }, 10);

    const result = await client.request('TestMethod', { foo: 'bar' });
    expect(result).toEqual({ ok: true });

    const sent = JSON.parse(chunks.join(''));
    expect(sent).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'TestMethod',
      params: { foo: 'bar' },
    });
  });

  it('auto-increments request IDs', async () => {
    const chunks: string[] = [];
    output.on('data', (chunk: string) => chunks.push(chunk));

    setTimeout(() => {
      input.write('{"jsonrpc":"2.0","id":1,"result":"a"}\n');
    }, 10);
    await client.request('M1');

    setTimeout(() => {
      input.write('{"jsonrpc":"2.0","id":2,"result":"b"}\n');
    }, 10);
    await client.request('M2');

    const parsed = chunks.map((c) => JSON.parse(c) as { id: number });
    expect(parsed[0]!.id).toBe(1);
    expect(parsed[1]!.id).toBe(2);
  });

  it('rejects on JSON-RPC error response', async () => {
    setTimeout(() => {
      input.write(
        '{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}\n',
      );
    }, 10);

    await expect(client.request('Unknown')).rejects.toThrow('Method not found');
  });

  it('rejects on timeout', async () => {
    // Create a client with very short timeout
    const fastClient = new JsonRpcClient(input, output, 50);

    await expect(fastClient.request('SlowMethod')).rejects.toThrow('timed out');

    fastClient.close();
  });

  it('emits notification events', async () => {
    const handler = vi.fn();
    client.on('notification', handler);

    input.write('{"jsonrpc":"2.0","method":"SessionEvent","params":{"type":"text_chunk"}}\n');

    // Give the event loop time to process
    await new Promise((r) => setTimeout(r, 20));

    expect(handler).toHaveBeenCalledWith('SessionEvent', { type: 'text_chunk' });
  });

  it('handles multiple messages in one chunk', async () => {
    const handler = vi.fn();
    client.on('notification', handler);

    setTimeout(() => {
      input.write('{"jsonrpc":"2.0","id":1,"result":"ok"}\n');
    }, 10);

    const result = await client.request('Test');
    expect(result).toBe('ok');

    input.write(
      '{"jsonrpc":"2.0","method":"E1","params":{"a":1}}\n{"jsonrpc":"2.0","method":"E2","params":{"b":2}}\n',
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('handles partial lines across chunks', async () => {
    setTimeout(() => {
      input.write('{"jsonrpc":"2.0","id":1,"res');
      input.write('ult":"split"}\n');
    }, 10);

    const result = await client.request('Partial');
    expect(result).toBe('split');
  });

  it('rejects pending requests on close', async () => {
    const promise = client.request('WillClose');
    client.close();

    await expect(promise).rejects.toThrow('Connection closed');
  });

  it('rejects requests when already closed', async () => {
    client.close();

    await expect(client.request('AfterClose')).rejects.toThrow('Connection closed');
  });

  it('tracks pending request count', () => {
    expect(client.pendingCount).toBe(0);

    // Fire and forget — will timeout but we check count
    void client.request('A').catch(() => {});
    void client.request('B').catch(() => {});

    expect(client.pendingCount).toBe(2);

    client.close();
    expect(client.pendingCount).toBe(0);
  });

  it('emits error on malformed JSON', async () => {
    const errorHandler = vi.fn();
    client.on('error', errorHandler);

    input.write('not valid json\n');

    await new Promise((r) => setTimeout(r, 20));
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
  });
});
