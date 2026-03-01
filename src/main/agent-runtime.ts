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

    const binaryPath = this.locateBinary();

    const child = spawn(binaryPath, ['--mode', 'stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.process = child;

    const { stdout, stdin } = child;

    const rpcClient = new JsonRpcClient(stdout, stdin);
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
      const wasRunning = this.status === 'running' || this.status === 'starting';
      this.process = null;
      this.client = null;

      if (wasRunning) {
        this.setStatus('crashed');
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_EVENTS.RUNTIME_CRASHED, { code, signal });
        }
      } else {
        this.setStatus('stopped');
      }
    });

    // Collect stderr for debugging
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data: string) => {
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

    const child = this.process;
    const client = this.client;

    // Try graceful shutdown via JSON-RPC
    try {
      await client.request('Shutdown', undefined, SHUTDOWN_TIMEOUT_MS);
      // Process should exit on its own
      await this.waitForExit(child, SHUTDOWN_TIMEOUT_MS);
      return;
    } catch {
      // Shutdown RPC failed or timed out — escalate
    }

    // SIGTERM
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      try {
        await this.waitForExit(child, SIGTERM_GRACE_MS);
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
