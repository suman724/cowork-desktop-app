import { EventEmitter } from 'node:events';
import type { Readable, Writable } from 'node:stream';

/** JSON-RPC 2.0 request */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

/** JSON-RPC 2.0 response */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: JsonRpcError;
}

/** JSON-RPC 2.0 notification (no id) */
interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/** JSON-RPC 2.0 error object */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

type JsonRpcMessage = JsonRpcResponse | JsonRpcNotification;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * JSON-RPC 2.0 client over newline-delimited JSON streams (stdio).
 *
 * - Writes JSON-RPC requests to `output` (child stdin)
 * - Reads newline-delimited JSON-RPC responses/notifications from `input` (child stdout)
 * - Emits 'notification' events for server-pushed notifications
 */
export class JsonRpcClient extends EventEmitter {
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private buffer = '';
  private closed = false;

  constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly defaultTimeoutMs = 30_000,
  ) {
    super();
    this.input.setEncoding('utf8');
    this.input.on('data', (chunk: string) => this.onData(chunk));
    this.input.on('end', () => this.onClose());
    this.input.on('error', (err: Error) => this.emit('error', err));
  }

  /**
   * Send a JSON-RPC request and wait for the response.
   */
  async request<T = unknown>(method: string, params?: unknown, timeoutMs?: number): Promise<T> {
    if (this.closed) {
      throw new Error('Connection closed');
    }

    const id = this.nextId++;
    const timeout = timeoutMs ?? this.defaultTimeoutMs;

    const msg: JsonRpcRequest = { jsonrpc: '2.0', id, method };
    if (params !== undefined) {
      msg.params = params;
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timed out after ${timeout}ms: ${method}`));
      }, timeout);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      const line = JSON.stringify(msg) + '\n';
      this.output.write(line);
    });
  }

  /**
   * Close the client and reject all pending requests.
   */
  close(): void {
    this.closed = true;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
      this.pending.delete(id);
    }
  }

  /** Number of pending requests */
  get pendingCount(): number {
    return this.pending.size;
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;

      let msg: JsonRpcMessage;
      try {
        msg = JSON.parse(trimmed) as JsonRpcMessage;
      } catch {
        this.emit('error', new Error(`Failed to parse JSON-RPC message: ${trimmed.slice(0, 100)}`));
        continue;
      }

      if ('id' in msg) {
        this.handleResponse(msg);
      } else if ('method' in msg) {
        this.handleNotification(msg);
      }
    }
  }

  private handleResponse(msg: JsonRpcResponse): void {
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    this.pending.delete(msg.id);
    clearTimeout(pending.timer);

    if (msg.error) {
      const err = new Error(msg.error.message);
      (err as Error & { code: number }).code = msg.error.code;
      pending.reject(err);
    } else {
      pending.resolve(msg.result);
    }
  }

  private handleNotification(msg: JsonRpcNotification): void {
    this.emit('notification', msg.method, msg.params);
  }

  private onClose(): void {
    this.close();
    this.emit('close');
  }
}
