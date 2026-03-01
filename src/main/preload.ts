import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPC_EVENTS } from '../shared/ipc-channels';
import type {
  IpcResponse,
  SessionEvent,
  SessionState,
  AgentRuntimeStatus,
  AppSettings,
  PatchPreview,
  SessionSummary,
  ConversationMessage,
} from '../shared/types';
import type { Workspace } from '@cowork/platform';

/**
 * Preload script — the sole bridge between main and renderer processes.
 *
 * Exposes a typed API via `window.coworkIPC`. Never exposes raw `ipcRenderer`.
 */

export interface CoworkIPC {
  // Session lifecycle
  createSession: (params: {
    tenantId: string;
    userId: string;
    workspaceHint?: { localPaths?: string[]; workspaceId?: string };
  }) => Promise<IpcResponse<SessionState>>;

  getSessionState: (params: { sessionId: string }) => Promise<IpcResponse<SessionState>>;

  // Task control
  startTask: (params: {
    sessionId: string;
    taskId: string;
    prompt: string;
    taskOptions?: {
      maxSteps?: number;
      allowNetwork?: boolean;
      approvalMode?: 'always' | 'on_risky_actions' | 'never';
    };
  }) => Promise<IpcResponse<void>>;

  cancelTask: (params: { sessionId: string; taskId: string }) => Promise<IpcResponse<void>>;

  // Approval
  resolveApproval: (params: {
    approvalId: string;
    decision: 'approved' | 'denied';
    reason?: string;
  }) => Promise<IpcResponse<void>>;

  // Patch preview
  getPatchPreview: (params: {
    sessionId: string;
    taskId: string;
  }) => Promise<IpcResponse<PatchPreview>>;

  // Workspace Service (history)
  listWorkspaces: (params: {
    tenantId: string;
    userId: string;
  }) => Promise<IpcResponse<Workspace[]>>;

  listSessions: (params: { workspaceId: string }) => Promise<IpcResponse<SessionSummary[]>>;

  getSessionHistory: (params: {
    workspaceId: string;
    sessionId: string;
  }) => Promise<IpcResponse<ConversationMessage[]>>;

  // Settings
  getSettings: () => Promise<IpcResponse<AppSettings>>;
  updateSettings: (params: Partial<AppSettings>) => Promise<IpcResponse<AppSettings>>;

  // Runtime control
  getRuntimeStatus: () => Promise<IpcResponse<AgentRuntimeStatus>>;
  shutdownRuntime: () => Promise<IpcResponse<void>>;

  // Log folder
  openLogFolder: (logDir: string) => Promise<IpcResponse<void>>;

  // Folder picker
  selectFolder: () => Promise<IpcResponse<string | null>>;

  // App info
  getVersion: () => Promise<IpcResponse<string>>;

  // Event listeners (returns cleanup function)
  onSessionEvent: (callback: (event: SessionEvent) => void) => () => void;
  onRuntimeStatusChanged: (callback: (status: AgentRuntimeStatus) => void) => () => void;
  onRuntimeCrashed: (
    callback: (info: { code: number | null; signal: string | null }) => void,
  ) => () => void;
}

const coworkIPC: CoworkIPC = {
  // Session lifecycle
  createSession: (params) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, params),
  getSessionState: (params) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_STATE, params),

  // Task control
  startTask: (params) => ipcRenderer.invoke(IPC_CHANNELS.TASK_START, params),
  cancelTask: (params) => ipcRenderer.invoke(IPC_CHANNELS.TASK_CANCEL, params),

  // Approval
  resolveApproval: (params) => ipcRenderer.invoke(IPC_CHANNELS.APPROVAL_RESOLVE, params),

  // Patch preview
  getPatchPreview: (params) => ipcRenderer.invoke(IPC_CHANNELS.PATCH_GET_PREVIEW, params),

  // Workspace Service
  listWorkspaces: (params) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST, params),
  listSessions: (params) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_LIST_SESSIONS, params),
  getSessionHistory: (params) =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_SESSION_HISTORY, params),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (params) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, params),

  // Runtime
  getRuntimeStatus: () => ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_STATUS),
  shutdownRuntime: () => ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_SHUTDOWN),

  // Log folder
  openLogFolder: (logDir) => ipcRenderer.invoke(IPC_CHANNELS.RUNTIME_OPEN_LOG_FOLDER, logDir),

  // Folder picker
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_SELECT),

  // App
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

  // Push event listeners
  onSessionEvent: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: SessionEvent): void => {
      callback(data);
    };
    ipcRenderer.on(IPC_EVENTS.SESSION_EVENT, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.SESSION_EVENT, handler);
  },

  onRuntimeStatusChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: AgentRuntimeStatus): void => {
      callback(status);
    };
    ipcRenderer.on(IPC_EVENTS.RUNTIME_STATUS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.RUNTIME_STATUS_CHANGED, handler);
  },

  onRuntimeCrashed: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { code: number | null; signal: string | null },
    ): void => {
      callback(info);
    };
    ipcRenderer.on(IPC_EVENTS.RUNTIME_CRASHED, handler);
    return () => ipcRenderer.removeListener(IPC_EVENTS.RUNTIME_CRASHED, handler);
  },
};

contextBridge.exposeInMainWorld('coworkIPC', coworkIPC);
