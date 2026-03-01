import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

// Create a mock child process factory
function createMockChild(): EventEmitter & {
  stdout: PassThrough;
  stdin: PassThrough;
  stderr: PassThrough;
  exitCode: number | null;
  kill: ReturnType<typeof vi.fn>;
  pid: number;
} {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stdin: PassThrough;
    stderr: PassThrough;
    exitCode: number | null;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
  };
  child.stdout = new PassThrough();
  child.stdin = new PassThrough();
  child.stderr = new PassThrough();
  child.stderr.setEncoding('utf8');
  child.exitCode = null;
  child.kill = vi.fn();
  child.pid = 12345;
  return child;
}

let mockChild: ReturnType<typeof createMockChild>;
const mockSpawn = vi.fn();

// Mock child_process — must export spawn as named export
vi.mock('node:child_process', () => {
  return {
    spawn: (...args: unknown[]): unknown => mockSpawn(...args) as unknown,
    default: {
      spawn: (...args: unknown[]): unknown => mockSpawn(...args) as unknown,
    },
  };
});

// Mock electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/mock/app',
  },
}));

import { AgentRuntimeManager } from '../../../src/main/agent-runtime';
import { IPC_EVENTS } from '../../../src/shared/ipc-channels';

describe('AgentRuntimeManager', () => {
  let manager: AgentRuntimeManager;
  let mockWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: { send: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChild = createMockChild();
    mockSpawn.mockReturnValue(mockChild);

    manager = new AgentRuntimeManager();
    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: { send: vi.fn() },
    };
    manager.setMainWindow(mockWindow as never);
  });

  // --- Basic state ---

  it('starts with stopped status', () => {
    expect(manager.getStatus()).toBe('stopped');
  });

  it('getClient returns null when stopped', () => {
    expect(manager.getClient()).toBeNull();
  });

  it('shutdown on stopped runtime is a no-op', async () => {
    await manager.shutdown();
    expect(manager.getStatus()).toBe('stopped');
  });

  it('setMainWindow stores the window reference', () => {
    const newWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: { send: vi.fn() },
    };
    manager.setMainWindow(newWindow as never);
    expect(manager.getStatus()).toBe('stopped');
  });

  // --- Spawn lifecycle ---

  it('start spawns process and transitions to running', () => {
    manager.start();

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
    expect(manager.getStatus()).toBe('running');
    expect(manager.getClient()).not.toBeNull();
  });

  it('start is idempotent when already running', () => {
    manager.start();
    manager.start();

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('notifies renderer of status changes', () => {
    manager.start();

    // Should have sent 'starting' then 'running'
    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.RUNTIME_STATUS_CHANGED,
      'starting',
    );
    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.RUNTIME_STATUS_CHANGED,
      'running',
    );
  });

  // --- Crash detection ---

  it('detects crash when child exits unexpectedly and attempts auto-restart', () => {
    manager.start();
    mockWindow.webContents.send.mockClear();

    // Simulate unexpected exit
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);

    // With auto-restart, status transitions to 'reconnecting' instead of 'crashed'
    expect(manager.getStatus()).toBe('reconnecting');
    expect(manager.getClient()).toBeNull();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith(IPC_EVENTS.RUNTIME_CRASHED, {
      code: 1,
      signal: null,
    });
  });

  it('detects crash on spawn error event', () => {
    manager.start();
    mockWindow.webContents.send.mockClear();

    mockChild.emit('error', new Error('ENOENT'));

    expect(manager.getStatus()).toBe('crashed');
    expect(mockWindow.webContents.send).toHaveBeenCalledWith(IPC_EVENTS.RUNTIME_CRASHED, {
      code: null,
      signal: null,
    });
  });

  it('handles spawn() throwing synchronously', () => {
    mockSpawn.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    manager.start();

    expect(manager.getStatus()).toBe('crashed');
    expect(manager.getClient()).toBeNull();
  });

  // --- Graceful shutdown ---

  it('shutdown sets shuttingDown flag preventing crash notification', async () => {
    manager.start();
    mockWindow.webContents.send.mockClear();

    // Schedule the Shutdown RPC response and process exit
    // These must happen asynchronously after shutdown() sends the request
    setTimeout(() => {
      mockChild.stdout.write('{"jsonrpc":"2.0","id":1,"result":null}\n');
      setTimeout(() => {
        mockChild.exitCode = 0;
        mockChild.emit('exit', 0, null);
      }, 10);
    }, 10);

    await manager.shutdown();

    expect(manager.getStatus()).toBe('stopped');
    // Should NOT have sent RUNTIME_CRASHED
    const crashCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: unknown[]) => c[0] === IPC_EVENTS.RUNTIME_CRASHED,
    );
    expect(crashCalls).toHaveLength(0);
  });

  it('does not send notifications when window is destroyed', () => {
    mockWindow.isDestroyed.mockReturnValue(true);

    manager.start();

    // Status changes should be set but no send() calls
    expect(manager.getStatus()).toBe('running');
    expect(mockWindow.webContents.send).not.toHaveBeenCalled();
  });

  // --- JSON-RPC notification forwarding ---

  it('forwards SessionEvent notifications to renderer', () => {
    manager.start();
    mockWindow.webContents.send.mockClear();

    const client = manager.getClient()!;
    // Simulate a notification from the agent-runtime
    client.emit('notification', 'SessionEvent', { eventType: 'text_chunk', text: 'hello' });

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(IPC_EVENTS.SESSION_EVENT, {
      eventType: 'text_chunk',
      text: 'hello',
    });
  });

  it('ignores non-SessionEvent notifications', () => {
    manager.start();
    mockWindow.webContents.send.mockClear();

    const client = manager.getClient()!;
    client.emit('notification', 'SomeOtherMethod', { data: 123 });

    // Should not forward
    const sessionEventCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: unknown[]) => c[0] === IPC_EVENTS.SESSION_EVENT,
    );
    expect(sessionEventCalls).toHaveLength(0);
  });

  // --- Auto-restart ---

  it('auto-restarts after unexpected crash', async () => {
    vi.useFakeTimers();

    manager.start();
    mockWindow.webContents.send.mockClear();

    // Simulate unexpected exit
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);

    // Should transition to 'reconnecting' (not 'crashed')
    expect(manager.getStatus()).toBe('reconnecting');

    // Create a fresh mock child for the restart
    mockChild = createMockChild();
    mockSpawn.mockReturnValue(mockChild);

    // Wait for the restart timer (base delay is 1s)
    await vi.advanceTimersByTimeAsync(1_100);

    expect(manager.getStatus()).toBe('running');
    expect(mockSpawn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('detects crash loop after max restart attempts', async () => {
    vi.useFakeTimers();

    // First crash + restart
    manager.start();
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);
    expect(manager.getStatus()).toBe('reconnecting');

    // Restart attempt 1
    mockChild = createMockChild();
    mockSpawn.mockReturnValue(mockChild);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(manager.getStatus()).toBe('running');

    // Second crash + restart
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);
    expect(manager.getStatus()).toBe('reconnecting');

    mockChild = createMockChild();
    mockSpawn.mockReturnValue(mockChild);
    await vi.advanceTimersByTimeAsync(2_100);
    expect(manager.getStatus()).toBe('running');

    // Third crash + restart
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);
    expect(manager.getStatus()).toBe('reconnecting');

    mockChild = createMockChild();
    mockSpawn.mockReturnValue(mockChild);
    await vi.advanceTimersByTimeAsync(4_100);
    expect(manager.getStatus()).toBe('running');

    // Fourth crash — should be crash loop
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);
    expect(manager.getStatus()).toBe('crashed');

    vi.useRealTimers();
  });

  it('shutdown cancels pending restart timer', async () => {
    manager.start();
    mockWindow.webContents.send.mockClear();

    // Simulate crash → reconnecting
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);
    expect(manager.getStatus()).toBe('reconnecting');

    // Shutdown should cancel the pending restart and go to 'stopped'
    await manager.shutdown();
    expect(manager.getStatus()).toBe('stopped');
  });

  it('successful start after crash resets from reconnecting', async () => {
    vi.useFakeTimers();

    manager.start();
    mockChild.exitCode = 1;
    mockChild.emit('exit', 1, null);
    expect(manager.getStatus()).toBe('reconnecting');

    // Restart succeeds
    mockChild = createMockChild();
    mockSpawn.mockReturnValue(mockChild);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(manager.getStatus()).toBe('running');

    vi.useRealTimers();
  });
});
