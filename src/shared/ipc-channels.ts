/**
 * IPC channel names for ipcMain.handle / ipcRenderer.invoke.
 * Each maps to a specific operation exposed via the preload bridge.
 */
export const IPC_CHANNELS = {
  // Session lifecycle
  SESSION_CREATE: 'session:create',
  SESSION_RESUME: 'session:resume',
  SESSION_GET_STATE: 'session:get-state',
  SESSION_GET_EVENTS: 'session:get-events',

  // Task control
  TASK_START: 'task:start',
  TASK_CANCEL: 'task:cancel',

  // Approval
  APPROVAL_RESOLVE: 'approval:resolve',

  // Patch preview
  PATCH_GET_PREVIEW: 'patch:get-preview',

  // Workspace Service (history browsing)
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_LIST_SESSIONS: 'workspace:list-sessions',
  WORKSPACE_GET_SESSION_HISTORY: 'workspace:get-session-history',
  WORKSPACE_DELETE: 'workspace:delete',
  SESSION_DELETE: 'workspace:delete-session',

  // Session Service
  SESSION_UPDATE_NAME: 'session:update-name',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Agent runtime control
  RUNTIME_STATUS: 'runtime:status',
  RUNTIME_SHUTDOWN: 'runtime:shutdown',
  RUNTIME_OPEN_LOG_FOLDER: 'runtime:open-log-folder',

  // Folder picker
  FOLDER_SELECT: 'folder:select',

  // Browser control
  BROWSER_PAUSE: 'browser:pause',
  BROWSER_RESUME: 'browser:resume',
  BROWSER_CLOSE: 'browser:close',
  BROWSER_TAKEOVER: 'browser:takeover',

  // App lifecycle
  APP_GET_VERSION: 'app:get-version',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/**
 * IPC event names for ipcMain → renderer push notifications.
 * Used via webContents.send / ipcRenderer.on.
 */
export const IPC_EVENTS = {
  /** Agent runtime session event (text_chunk, tool_requested, etc.) */
  SESSION_EVENT: 'push:session-event',

  /** Agent runtime status changed (starting, running, crashed, stopped) */
  RUNTIME_STATUS_CHANGED: 'push:runtime-status-changed',

  /** Agent runtime crashed unexpectedly */
  RUNTIME_CRASHED: 'push:runtime-crashed',
} as const;

export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS];
