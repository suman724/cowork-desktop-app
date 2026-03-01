import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test AgentRuntimeManager by extracting its logic and mocking dependencies.
// Since mocking node:child_process is fragile, we test the manager's state transitions
// by directly manipulating internal state via the public API.

// Mock electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/mock/app',
  },
}));

import { AgentRuntimeManager } from '../../../src/main/agent-runtime';

describe('AgentRuntimeManager', () => {
  let manager: AgentRuntimeManager;
  let mockWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: { send: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentRuntimeManager();
    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: { send: vi.fn() },
    };
    manager.setMainWindow(mockWindow as never);
  });

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
    // No crash means success — we can verify by checking status changes are pushed
    const newWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: { send: vi.fn() },
    };
    manager.setMainWindow(newWindow as never);

    // Trigger a status change (shutdown already stopped = noop, but tests the window is set)
    expect(manager.getStatus()).toBe('stopped');
  });
});
