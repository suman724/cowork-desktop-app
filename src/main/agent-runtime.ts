import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { app, type BrowserWindow } from 'electron';
import { JsonRpcClient } from './json-rpc-client';
import { IPC_EVENTS } from '../shared/ipc-channels';
import type { AgentRuntimeStatus, SessionEvent } from '../shared/types';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const SIGTERM_GRACE_MS = 5_000;

/**
 * Manages the cowork-agent-runtime child process lifecycle.
 *
 * - Spawns the runtime binary
 * - Creates a JsonRpcClient on its stdio
 * - Monitors for crashes
 * - Handles graceful shutdown
 * - Forwards session events to the renderer via webContents.send
 */
export class AgentRuntimeManager {
  private process: ChildProcess | null = null;
  private client: JsonRpcClient | null = null;
  private status: AgentRuntimeStatus = 'stopped';
  private mainWindow: BrowserWindow | null = null;
  private shuttingDown = false;

  /** Set the main window for push notifications */
  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  /** Get current runtime status */
  getStatus(): AgentRuntimeStatus {
    return this.status;
  }

  /** Get the JSON-RPC client (null if not running) */
  getClient(): JsonRpcClient | null {
    return this.client;
  }

  /**
   * Spawn the agent-runtime process and establish JSON-RPC communication.
   */
  start(): void {
    if (this.status === 'running' || this.status === 'starting') {
      return;
    }

    this.setStatus('starting');
    this.shuttingDown = false;

    const binaryPath = this.locateBinary();

    let child: ChildProcess;
    try {
      child = spawn(binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } catch (err) {
      console.error('[AgentRuntime] Failed to spawn:', err);
      this.setStatus('crashed');
      return;
    }

    this.process = child;

    // Handle spawn errors (e.g., ENOENT when binary doesn't exist)
    child.on('error', (err: Error) => {
      console.error('[AgentRuntime] Process error:', err.message);
      if (!this.shuttingDown) {
        this.process = null;
        this.client = null;
        this.setStatus('crashed');
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_EVENTS.RUNTIME_CRASHED, {
            code: null,
            signal: null,
          });
        }
      }
    });

    const { stdout, stdin } = child;

    // stdout and stdin are guaranteed non-null with stdio: ['pipe', 'pipe', 'pipe']
    const childStdout = stdout as import('node:stream').Readable;
    const childStdin = stdin as import('node:stream').Writable;
    const rpcClient = new JsonRpcClient(childStdout, childStdin);
    this.client = rpcClient;

    // Forward notifications to renderer
    rpcClient.on('notification', (method: string, params: unknown) => {
      if (method === 'SessionEvent' && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_EVENTS.SESSION_EVENT, params as SessionEvent);
      }
    });

    rpcClient.on('error', (err: Error) => {
      console.error('[AgentRuntime] JSON-RPC error:', err.message);
    });

    // Monitor for unexpected exit
    child.on('exit', (code, signal) => {
      this.process = null;
      this.client = null;

      if (this.shuttingDown) {
        this.setStatus('stopped');
      } else if (this.status === 'running' || this.status === 'starting') {
        this.setStatus('crashed');
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_EVENTS.RUNTIME_CRASHED, { code, signal });
        }
      } else {
        this.setStatus('stopped');
      }
    });

    // Collect stderr for debugging
    const childStderr = child.stderr as import('node:stream').Readable;
    childStderr.setEncoding('utf8');
    childStderr.on('data', (data: string) => {
      console.error('[AgentRuntime stderr]', data.trim());
    });

    this.setStatus('running');
  }

  /**
   * Gracefully shut down the agent-runtime.
   * Sends Shutdown RPC → waits 10s → SIGTERM → waits 5s → SIGKILL.
   */
  async shutdown(): Promise<void> {
    if (!this.process || !this.client) {
      this.setStatus('stopped');
      return;
    }

    this.shuttingDown = true;
    const child = this.process;
    const client = this.client;

    // Try graceful shutdown via JSON-RPC
    try {
      await client.request('Shutdown', undefined, SHUTDOWN_TIMEOUT_MS);
      // Process should exit on its own
      await this.waitForExit(child, SHUTDOWN_TIMEOUT_MS);
      client.close();
      this.process = null;
      this.client = null;
      this.setStatus('stopped');
      return;
    } catch {
      // Shutdown RPC failed or timed out — escalate
    }

    // SIGTERM
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      try {
        await this.waitForExit(child, SIGTERM_GRACE_MS);
        client.close();
        this.process = null;
        this.client = null;
        this.setStatus('stopped');
        return;
      } catch {
        // Still alive — SIGKILL
      }
    }

    // SIGKILL
    if (child.exitCode === null) {
      child.kill('SIGKILL');
    }

    client.close();
    this.process = null;
    this.client = null;
    this.setStatus('stopped');
  }

  private setStatus(status: AgentRuntimeStatus): void {
    this.status = status;
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_EVENTS.RUNTIME_STATUS_CHANGED, status);
    }
  }

  private locateBinary(): string {
    // In production: bundled alongside the Electron app
    // In development: configurable via env var
    if (process.env['AGENT_RUNTIME_PATH']) {
      return process.env['AGENT_RUNTIME_PATH'];
    }

    const resourcesPath = app.isPackaged
      ? join(process.resourcesPath, 'agent-runtime')
      : join(app.getAppPath(), '..', 'cowork-agent-runtime', 'dist', 'agent-runtime');

    return resourcesPath;
  }

  private waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (child.exitCode !== null) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        child.removeListener('exit', onExit);
        reject(new Error('Timeout waiting for process exit'));
      }, timeoutMs);

      const onExit = (): void => {
        clearTimeout(timer);
        resolve();
      };

      child.once('exit', onExit);
    });
  }
}
