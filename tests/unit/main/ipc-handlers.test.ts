import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron
const mockHandle = vi.fn();
vi.mock('electron', () => ({
  ipcMain: {
    handle: (...args: unknown[]): void => {
      mockHandle(...args);
    },
  },
  app: {
    getVersion: (): string => '1.0.0-test',
  },
  shell: {
    openPath: vi.fn().mockResolvedValue(''),
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/folder'] }),
  },
}));

// Mock os
vi.mock('node:os', () => ({
  platform: () => 'darwin',
  release: () => '25.0.0',
}));

import { registerIpcHandlers } from '../../../src/main/ipc-handlers';
import { IPC_CHANNELS } from '../../../src/shared/ipc-channels';

describe('registerIpcHandlers', () => {
  // Collect registered handlers by channel name
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  let mockRuntime: {
    getStatus: ReturnType<typeof vi.fn>;
    getClient: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    shutdown: ReturnType<typeof vi.fn>;
  };
  let mockWorkspaceClient: {
    listWorkspaces: ReturnType<typeof vi.fn>;
    listSessions: ReturnType<typeof vi.fn>;
    getSessionHistory: ReturnType<typeof vi.fn>;
    updateConfig: ReturnType<typeof vi.fn>;
  };
  let mockSettingsStore: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockRpcClient: {
    request: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    handlers.clear();
    mockHandle.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    mockRpcClient = {
      request: vi.fn(),
    };

    mockRuntime = {
      getStatus: vi.fn().mockReturnValue('running'),
      getClient: vi.fn().mockReturnValue(mockRpcClient),
      start: vi.fn(),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    mockWorkspaceClient = {
      listWorkspaces: vi.fn(),
      listSessions: vi.fn(),
      getSessionHistory: vi.fn(),
      updateConfig: vi.fn(),
    };

    mockSettingsStore = {
      get: vi.fn().mockReturnValue({
        theme: 'system',
        approvalMode: 'on_risky_actions',
        maxStepsPerTask: 40,
        workspaceServiceUrl: 'http://localhost:8002',
        networkTimeoutMs: 30000,
      }),
      update: vi.fn().mockReturnValue({
        theme: 'system',
        approvalMode: 'on_risky_actions',
        maxStepsPerTask: 40,
        workspaceServiceUrl: 'http://localhost:8002',
        networkTimeoutMs: 30000,
      }),
    };

    registerIpcHandlers(
      mockRuntime as never,
      mockWorkspaceClient as never,
      mockSettingsStore as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers all expected channels', () => {
    const expectedChannels = Object.values(IPC_CHANNELS);
    for (const channel of expectedChannels) {
      expect(handlers.has(channel), `handler for ${channel}`).toBe(true);
    }
  });

  // --- Session lifecycle ---

  it('session:create starts runtime if stopped and calls CreateSession', async () => {
    mockRuntime.getStatus.mockReturnValue('stopped');
    mockRpcClient.request.mockResolvedValue({ session: { sessionId: 's-1' } });

    const handler = handlers.get(IPC_CHANNELS.SESSION_CREATE)!;
    const result = await handler({}, { tenantId: 't-1', userId: 'u-1' });

    expect(mockRuntime.start).toHaveBeenCalled();
    expect(mockRpcClient.request).toHaveBeenCalledWith(
      'CreateSession',
      expect.objectContaining({
        tenantId: 't-1',
        userId: 'u-1',
        executionEnvironment: 'desktop',
        supportedCapabilities: expect.arrayContaining(['File.Read']),
      }),
      60000,
    );
    expect(result).toEqual({ success: true, data: { session: { sessionId: 's-1' } } });
  });

  it('session:create returns failure when runtime has no client', async () => {
    mockRuntime.getClient.mockReturnValue(null);

    const handler = handlers.get(IPC_CHANNELS.SESSION_CREATE)!;
    const result = await handler({}, { tenantId: 't-1', userId: 'u-1' });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'RUNTIME_NOT_AVAILABLE' }),
      }),
    );
  });

  it('session:create returns rpcError on RPC failure', async () => {
    const err = new Error('Connection closed');
    (err as Error & { code: number }).code = -32001;
    mockRpcClient.request.mockRejectedValue(err);

    const handler = handlers.get(IPC_CHANNELS.SESSION_CREATE)!;
    const result = await handler({}, { tenantId: 't-1', userId: 'u-1' });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: '-32001' }),
      }),
    );
  });

  it('session:resume starts runtime if stopped and calls ResumeSession', async () => {
    mockRuntime.getStatus.mockReturnValue('stopped');
    mockRpcClient.request.mockResolvedValue({ sessionId: 's-1', workspaceId: 'ws-1' });

    const handler = handlers.get(IPC_CHANNELS.SESSION_RESUME)!;
    const result = await handler({}, { sessionId: 's-1' });

    expect(mockRuntime.start).toHaveBeenCalled();
    expect(mockRpcClient.request).toHaveBeenCalledWith(
      'ResumeSession',
      { sessionId: 's-1' },
      60000,
    );
    expect(result).toEqual({
      success: true,
      data: { sessionId: 's-1', workspaceId: 'ws-1' },
    });
  });

  it('session:resume returns failure when runtime has no client', async () => {
    mockRuntime.getClient.mockReturnValue(null);

    const handler = handlers.get(IPC_CHANNELS.SESSION_RESUME)!;
    const result = await handler({}, { sessionId: 's-1' });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'RUNTIME_NOT_AVAILABLE' }),
      }),
    );
  });

  // --- Task control ---

  it('task:start forwards taskOptions to RPC', async () => {
    mockRpcClient.request.mockResolvedValue({});

    const handler = handlers.get(IPC_CHANNELS.TASK_START)!;
    await handler(
      {},
      {
        sessionId: 's-1',
        taskId: 't-1',
        prompt: 'do something',
        taskOptions: { maxSteps: 50, approvalMode: 'always' },
      },
    );

    expect(mockRpcClient.request).toHaveBeenCalledWith(
      'StartTask',
      expect.objectContaining({
        taskOptions: { maxSteps: 50, approvalMode: 'always' },
      }),
    );
  });

  it('task:cancel calls CancelTask RPC', async () => {
    mockRpcClient.request.mockResolvedValue({});

    const handler = handlers.get(IPC_CHANNELS.TASK_CANCEL)!;
    const result = await handler({}, { sessionId: 's-1', taskId: 't-1' });

    expect(mockRpcClient.request).toHaveBeenCalledWith('CancelTask', {
      sessionId: 's-1',
      taskId: 't-1',
    });
    expect(result).toEqual({ success: true, data: {} });
  });

  // --- Approval ---

  it('approval:resolve calls ApproveAction RPC', async () => {
    mockRpcClient.request.mockResolvedValue({});

    const handler = handlers.get(IPC_CHANNELS.APPROVAL_RESOLVE)!;
    await handler({}, { approvalId: 'a-1', decision: 'approved', reason: 'looks safe' });

    expect(mockRpcClient.request).toHaveBeenCalledWith('ApproveAction', {
      approvalId: 'a-1',
      decision: 'approved',
      reason: 'looks safe',
    });
  });

  // --- Workspace Service ---

  it('workspace:list calls workspaceClient and wraps result', async () => {
    mockWorkspaceClient.listWorkspaces.mockResolvedValue([{ workspaceId: 'ws-1' }]);

    const handler = handlers.get(IPC_CHANNELS.WORKSPACE_LIST)!;
    const result = await handler({}, { tenantId: 't-1', userId: 'u-1' });

    expect(mockWorkspaceClient.listWorkspaces).toHaveBeenCalledWith('t-1', 'u-1');
    expect(result).toEqual({ success: true, data: [{ workspaceId: 'ws-1' }] });
  });

  it('workspace:list returns failure on error', async () => {
    mockWorkspaceClient.listWorkspaces.mockRejectedValue(new Error('Connection refused'));

    const handler = handlers.get(IPC_CHANNELS.WORKSPACE_LIST)!;
    const result = await handler({}, { tenantId: 't-1', userId: 'u-1' });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Connection refused' }),
      }),
    );
  });

  it('workspace:list-sessions calls workspaceClient', async () => {
    mockWorkspaceClient.listSessions.mockResolvedValue([{ sessionId: 'sess-1' }]);

    const handler = handlers.get(IPC_CHANNELS.WORKSPACE_LIST_SESSIONS)!;
    const result = await handler({}, { workspaceId: 'ws-1' });

    expect(result).toEqual({ success: true, data: [{ sessionId: 'sess-1' }] });
  });

  it('workspace:get-session-history calls workspaceClient', async () => {
    mockWorkspaceClient.getSessionHistory.mockResolvedValue([{ role: 'user', content: 'hi' }]);

    const handler = handlers.get(IPC_CHANNELS.WORKSPACE_GET_SESSION_HISTORY)!;
    const result = await handler({}, { workspaceId: 'ws-1', sessionId: 'sess-1' });

    expect(result).toEqual({ success: true, data: [{ role: 'user', content: 'hi' }] });
  });

  // --- Settings ---

  it('settings:get returns current settings', () => {
    const handler = handlers.get(IPC_CHANNELS.SETTINGS_GET)!;
    const result = handler({});

    expect(mockSettingsStore.get).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('settings:update merges settings and updates workspace client', () => {
    const updated = {
      workspaceServiceUrl: 'http://new-host:9000',
      networkTimeoutMs: 5000,
    };
    mockSettingsStore.update.mockReturnValue({ ...updated, theme: 'system' });

    const handler = handlers.get(IPC_CHANNELS.SETTINGS_UPDATE)!;
    handler({}, updated);

    expect(mockSettingsStore.update).toHaveBeenCalledWith(updated);
    expect(mockWorkspaceClient.updateConfig).toHaveBeenCalledWith({
      baseUrl: 'http://new-host:9000',
      timeoutMs: 5000,
    });
  });

  it('settings:update does not update workspace client for non-network settings', () => {
    mockSettingsStore.update.mockReturnValue({ theme: 'dark' });

    const handler = handlers.get(IPC_CHANNELS.SETTINGS_UPDATE)!;
    handler({}, { theme: 'dark' });

    expect(mockWorkspaceClient.updateConfig).not.toHaveBeenCalled();
  });

  // --- Runtime control ---

  it('runtime:status returns current status', () => {
    const handler = handlers.get(IPC_CHANNELS.RUNTIME_STATUS)!;
    const result = handler({});

    expect(result).toEqual({ success: true, data: 'running' });
  });

  it('runtime:shutdown calls shutdown and returns success', async () => {
    const handler = handlers.get(IPC_CHANNELS.RUNTIME_SHUTDOWN)!;
    const result = await handler({});

    expect(mockRuntime.shutdown).toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('runtime:shutdown returns failure on error', async () => {
    mockRuntime.shutdown.mockRejectedValue(new Error('Kill failed'));

    const handler = handlers.get(IPC_CHANNELS.RUNTIME_SHUTDOWN)!;
    const result = await handler({});

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Kill failed' }),
      }),
    );
  });

  // --- App ---

  it('app:get-version returns version string', () => {
    const handler = handlers.get(IPC_CHANNELS.APP_GET_VERSION)!;
    const result = handler({});

    expect(result).toEqual({ success: true, data: '1.0.0-test' });
  });
});
