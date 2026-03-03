import { ipcMain, app, shell, dialog } from 'electron';
import * as os from 'node:os';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { IpcResponse, AppSettings } from '../shared/types';
import type { AgentRuntimeManager } from './agent-runtime';
import type { WorkspaceServiceClient } from './workspace-client';
import type { SettingsStore } from './settings-store';
import type { JsonRpcError } from './json-rpc-client';

function success<T>(data: T): IpcResponse<T> {
  return { success: true, data };
}

function failure(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): IpcResponse<never> {
  return { success: false, error: { code, message, details } };
}

function rpcError(err: unknown): IpcResponse<never> {
  if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
    const rpc = err as JsonRpcError;
    return failure(
      String(rpc.code),
      rpc.message,
      typeof rpc.data === 'object' ? (rpc.data as Record<string, unknown>) : undefined,
    );
  }
  return failure('INTERNAL_ERROR', err instanceof Error ? err.message : 'Unknown error');
}

/**
 * Registers all ipcMain.handle handlers.
 * Each handler wraps results in IpcResponse<T> — never throws.
 */
export function registerIpcHandlers(
  runtime: AgentRuntimeManager,
  workspaceClient: WorkspaceServiceClient,
  settingsStore: SettingsStore,
): void {
  // --- Session lifecycle ---
  ipcMain.handle(
    IPC_CHANNELS.SESSION_CREATE,
    async (
      _event,
      params: {
        tenantId: string;
        userId: string;
        workspaceHint?: { localPaths?: string[]; workspaceId?: string };
      },
    ) => {
      try {
        // Ensure runtime is started
        if (runtime.getStatus() !== 'running') {
          runtime.start();
        }
        const client = runtime.getClient();
        if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');

        const result = await client.request(
          'CreateSession',
          {
            tenantId: params.tenantId,
            userId: params.userId,
            executionEnvironment: 'desktop',
            workspaceHint: params.workspaceHint,
            clientInfo: {
              desktopAppVersion: app.getVersion(),
              localAgentHostVersion: '1.0.0',
              osFamily: os.platform(),
              osVersion: os.release(),
            },
            supportedCapabilities: [
              'File.Read',
              'File.Write',
              'File.Delete',
              'Shell.Exec',
              'Network.Http',
              'LLM.Call',
            ],
          },
          60_000,
        );
        return success(result);
      } catch (err) {
        return rpcError(err);
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.SESSION_RESUME, async (_event, params: { sessionId: string }) => {
    try {
      // Ensure runtime is started
      if (runtime.getStatus() !== 'running') {
        runtime.start();
      }
      const client = runtime.getClient();
      if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');

      const result = await client.request('ResumeSession', { sessionId: params.sessionId }, 60_000);
      return success(result);
    } catch (err) {
      return rpcError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_GET_STATE, async (_event, params: { sessionId: string }) => {
    try {
      const client = runtime.getClient();
      if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');
      const result = await client.request('GetSessionState', params);
      return success(result);
    } catch (err) {
      return rpcError(err);
    }
  });

  // --- Task control ---
  ipcMain.handle(
    IPC_CHANNELS.TASK_START,
    async (
      _event,
      params: {
        sessionId: string;
        taskId: string;
        prompt: string;
        taskOptions?: {
          maxSteps?: number;
          allowNetwork?: boolean;
          approvalMode?: 'always' | 'on_risky_actions' | 'never';
        };
      },
    ) => {
      try {
        const client = runtime.getClient();
        if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');
        const result = await client.request('StartTask', {
          sessionId: params.sessionId,
          taskId: params.taskId,
          prompt: params.prompt,
          taskOptions: params.taskOptions,
        });
        return success(result);
      } catch (err) {
        return rpcError(err);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TASK_CANCEL,
    async (_event, params: { sessionId: string; taskId: string }) => {
      try {
        const client = runtime.getClient();
        if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');
        const result = await client.request('CancelTask', params);
        return success(result);
      } catch (err) {
        return rpcError(err);
      }
    },
  );

  // --- Approval ---
  ipcMain.handle(
    IPC_CHANNELS.APPROVAL_RESOLVE,
    async (
      _event,
      params: {
        approvalId: string;
        decision: 'approved' | 'denied';
        reason?: string;
      },
    ) => {
      try {
        const client = runtime.getClient();
        if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');
        const result = await client.request('ApproveAction', params);
        return success(result);
      } catch (err) {
        return rpcError(err);
      }
    },
  );

  // --- Patch preview ---
  ipcMain.handle(
    IPC_CHANNELS.PATCH_GET_PREVIEW,
    async (_event, params: { sessionId: string; taskId: string }) => {
      try {
        const client = runtime.getClient();
        if (!client) return failure('RUNTIME_NOT_AVAILABLE', 'Agent runtime is not running');
        const result = await client.request('GetPatchPreview', params);
        return success(result);
      } catch (err) {
        return rpcError(err);
      }
    },
  );

  // --- Workspace Service ---
  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_LIST,
    async (_event, params: { tenantId: string; userId: string }) => {
      try {
        const result = await workspaceClient.listWorkspaces(params.tenantId, params.userId);
        return success(result);
      } catch (err) {
        return failure(
          'WORKSPACE_ERROR',
          err instanceof Error ? err.message : 'Failed to list workspaces',
        );
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_LIST_SESSIONS,
    async (_event, params: { workspaceId: string }) => {
      try {
        const result = await workspaceClient.listSessions(params.workspaceId);
        return success(result);
      } catch (err) {
        return failure(
          'WORKSPACE_ERROR',
          err instanceof Error ? err.message : 'Failed to list sessions',
        );
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_GET_SESSION_HISTORY,
    async (
      _event,
      params: {
        workspaceId: string;
        sessionId: string;
      },
    ) => {
      try {
        const result = await workspaceClient.getSessionHistory(
          params.workspaceId,
          params.sessionId,
        );
        return success(result);
      } catch (err) {
        return failure(
          'WORKSPACE_ERROR',
          err instanceof Error ? err.message : 'Failed to get session history',
        );
      }
    },
  );

  // --- Workspace delete ---
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, async (_event, params: { workspaceId: string }) => {
    try {
      await workspaceClient.deleteWorkspace(params.workspaceId);
      return success(undefined);
    } catch (err) {
      return failure(
        'WORKSPACE_ERROR',
        err instanceof Error ? err.message : 'Failed to delete workspace',
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.SESSION_DELETE,
    async (_event, params: { workspaceId: string; sessionId: string }) => {
      try {
        await workspaceClient.deleteSession(params.workspaceId, params.sessionId);
        return success(undefined);
      } catch (err) {
        return failure(
          'WORKSPACE_ERROR',
          err instanceof Error ? err.message : 'Failed to delete session',
        );
      }
    },
  );

  // --- Settings ---
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return success(settingsStore.get());
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_event, params: Partial<AppSettings>) => {
    const updated = settingsStore.update(params);
    // Update workspace client config when URL changes
    if (params.workspaceServiceUrl !== undefined || params.networkTimeoutMs !== undefined) {
      workspaceClient.updateConfig({
        baseUrl: updated.workspaceServiceUrl,
        timeoutMs: updated.networkTimeoutMs,
      });
    }
    return success(updated);
  });

  // --- Runtime control ---
  ipcMain.handle(IPC_CHANNELS.RUNTIME_STATUS, () => {
    return success(runtime.getStatus());
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME_SHUTDOWN, async () => {
    try {
      await runtime.shutdown();
      return success(undefined);
    } catch (err) {
      return failure('SHUTDOWN_FAILED', err instanceof Error ? err.message : 'Shutdown failed');
    }
  });

  // --- Log folder ---
  ipcMain.handle(IPC_CHANNELS.RUNTIME_OPEN_LOG_FOLDER, async (_event, logDir: string) => {
    try {
      await shell.openPath(logDir);
      return success(undefined);
    } catch (err) {
      return failure(
        'OPEN_FOLDER_FAILED',
        err instanceof Error ? err.message : 'Failed to open log folder',
      );
    }
  });

  // --- Folder picker ---
  ipcMain.handle(IPC_CHANNELS.FOLDER_SELECT, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      if (result.canceled || result.filePaths.length === 0) return success(null);
      return success(result.filePaths[0]);
    } catch (err) {
      return failure(
        'FOLDER_SELECT_FAILED',
        err instanceof Error ? err.message : 'Failed to open folder picker',
      );
    }
  });

  // --- App ---
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return success(app.getVersion());
  });
}
