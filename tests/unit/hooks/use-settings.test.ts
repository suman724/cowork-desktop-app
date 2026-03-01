import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../../../src/renderer/hooks/use-settings';
import { useUIStore } from '../../../src/renderer/state/ui-store';
import { DEFAULT_SETTINGS } from '../../../src/shared/types';

const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();

Object.defineProperty(window, 'coworkIPC', {
  value: {
    getSettings: mockGetSettings,
    updateSettings: mockUpdateSettings,
  },
  writable: true,
  configurable: true,
});

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.getState().setSettings(DEFAULT_SETTINGS);
    mockGetSettings.mockResolvedValue({ success: true, data: DEFAULT_SETTINGS });
  });

  it('returns current settings from store', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('updates setting optimistically and calls IPC', async () => {
    mockUpdateSettings.mockResolvedValue({
      success: true,
      data: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });

    const { result } = renderHook(() => useSettings());

    // Wait for mount effect to complete
    await act(async () => {
      await vi.waitFor(() => expect(mockGetSettings).toHaveBeenCalled());
    });

    await act(async () => {
      await result.current.updateSetting('theme', 'dark');
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'dark' });
    expect(useUIStore.getState().settings.theme).toBe('dark');
  });

  it('rolls back on IPC failure', async () => {
    mockUpdateSettings.mockResolvedValue({
      success: false,
      error: { code: 'SAVE_FAILED', message: 'Disk full' },
    });

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSetting('theme', 'dark');
    });

    expect(result.current.error).toBe('Disk full');
    // Should roll back to original
    expect(useUIStore.getState().settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('rolls back on IPC exception', async () => {
    mockUpdateSettings.mockRejectedValue(new Error('IPC crash'));

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSetting('maxStepsPerTask', 100);
    });

    expect(result.current.error).toBe('IPC crash');
    expect(result.current.isLoading).toBe(false);
    expect(useUIStore.getState().settings.maxStepsPerTask).toBe(DEFAULT_SETTINGS.maxStepsPerTask);
  });
});
