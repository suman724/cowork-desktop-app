import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userData',
  },
}));

import { SettingsStore } from '../../../src/main/settings-store';
import { DEFAULT_SETTINGS } from '../../../src/shared/types';
import type { AppSettings } from '../../../src/shared/types';

describe('SettingsStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'settings-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns default settings when no file exists', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists settings to disk', () => {
    const filePath = join(tempDir, 'settings.json');
    const store = new SettingsStore(filePath);

    store.update({ theme: 'light' });

    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.theme).toBe('light');
  });

  it('merges partial updates', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));

    store.update({ theme: 'light' });
    const result = store.update({ maxStepsPerTask: 20 });

    expect(result.theme).toBe('light');
    expect(result.maxStepsPerTask).toBe(20);
    expect(result.approvalMode).toBe(DEFAULT_SETTINGS.approvalMode);
  });

  it('loads settings from existing file', () => {
    const filePath = join(tempDir, 'settings.json');
    const store1 = new SettingsStore(filePath);
    store1.update({ theme: 'light', maxStepsPerTask: 25 });

    // Create a new store pointing to the same file
    const store2 = new SettingsStore(filePath);
    const loaded = store2.get();

    expect(loaded.theme).toBe('light');
    expect(loaded.maxStepsPerTask).toBe(25);
  });

  it('handles corrupt settings file gracefully', async () => {
    const filePath = join(tempDir, 'settings.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(filePath, 'not valid json');

    const store = new SettingsStore(filePath);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('resets to defaults', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));
    store.update({ theme: 'light', maxStepsPerTask: 100 });

    const result = store.reset();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a copy, not a reference', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));
    const a = store.get();
    const b = store.get();

    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  // --- Validation tests ---

  it('clamps maxStepsPerTask to valid range', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));

    store.update({ maxStepsPerTask: -5 });
    expect(store.get().maxStepsPerTask).toBe(DEFAULT_SETTINGS.maxStepsPerTask);

    store.update({ maxStepsPerTask: 500 });
    expect(store.get().maxStepsPerTask).toBe(200);

    store.update({ maxStepsPerTask: 50 });
    expect(store.get().maxStepsPerTask).toBe(50);
  });

  it('clamps networkTimeoutMs to valid range', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));

    store.update({ networkTimeoutMs: 100 });
    expect(store.get().networkTimeoutMs).toBe(DEFAULT_SETTINGS.networkTimeoutMs);

    store.update({ networkTimeoutMs: 200_000 });
    expect(store.get().networkTimeoutMs).toBe(120_000);

    store.update({ networkTimeoutMs: 5000 });
    expect(store.get().networkTimeoutMs).toBe(5000);
  });

  it('rejects invalid theme values', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));

    store.update({ theme: 'neon' as AppSettings['theme'] });
    expect(store.get().theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('rejects invalid approvalMode values', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));

    store.update({ approvalMode: 'yolo' as AppSettings['approvalMode'] });
    expect(store.get().approvalMode).toBe(DEFAULT_SETTINGS.approvalMode);
  });

  it('rejects empty workspaceServiceUrl', () => {
    const store = new SettingsStore(join(tempDir, 'settings.json'));

    store.update({ workspaceServiceUrl: '' });
    expect(store.get().workspaceServiceUrl).toBe(DEFAULT_SETTINGS.workspaceServiceUrl);
  });

  it('validates settings loaded from corrupt file', async () => {
    const filePath = join(tempDir, 'settings.json');
    const { writeFileSync: writeSync } = await import('node:fs');
    writeSync(
      filePath,
      JSON.stringify({
        theme: 'invalid',
        maxStepsPerTask: -10,
        networkTimeoutMs: 5,
        approvalMode: 'yolo',
      }),
    );

    const store = new SettingsStore(filePath);
    const s = store.get();
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(s.maxStepsPerTask).toBe(DEFAULT_SETTINGS.maxStepsPerTask);
    expect(s.networkTimeoutMs).toBe(DEFAULT_SETTINGS.networkTimeoutMs);
    expect(s.approvalMode).toBe(DEFAULT_SETTINGS.approvalMode);
  });
});
