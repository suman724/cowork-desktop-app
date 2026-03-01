import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { AgentRuntimeManager } from './agent-runtime';
import { WorkspaceServiceClient } from './workspace-client';
import { SettingsStore } from './settings-store';
import { registerIpcHandlers } from './ipc-handlers';

const runtimeManager = new AgentRuntimeManager();
const settingsStore = new SettingsStore();
const settings = settingsStore.get();
const workspaceClient = new WorkspaceServiceClient({
  baseUrl: settings.workspaceServiceUrl,
  timeoutMs: settings.networkTimeoutMs,
});

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Cowork',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  runtimeManager.setMainWindow(win);

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    if (!app.isPackaged) {
      win.webContents.openDevTools();
    }
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

void app.whenReady().then(() => {
  registerIpcHandlers(runtimeManager, workspaceClient, settingsStore);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isQuitting = false;
app.on('before-quit', (event) => {
  if (!isQuitting) {
    isQuitting = true;
    event.preventDefault();
    void runtimeManager.shutdown().finally(() => app.quit());
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason);
});
