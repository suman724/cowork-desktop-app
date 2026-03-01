import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUIStore } from '../../../../src/renderer/state/ui-store';
import { SettingsView } from '../../../../src/renderer/views/settings/SettingsView';
import { DEFAULT_SETTINGS } from '../../../../src/shared/types';

// Mock window.coworkIPC
const mockUpdateSettings = vi.fn().mockResolvedValue({ success: true, data: DEFAULT_SETTINGS });
const mockGetSettings = vi.fn().mockResolvedValue({ success: true, data: DEFAULT_SETTINGS });

Object.defineProperty(window, 'coworkIPC', {
  value: {
    getSettings: mockGetSettings,
    updateSettings: mockUpdateSettings,
  },
  writable: true,
  configurable: true,
});

describe('SettingsView', () => {
  beforeEach(() => {
    useUIStore.getState().setSettings(DEFAULT_SETTINGS);
    vi.clearAllMocks();
  });

  it('renders settings header', () => {
    render(<SettingsView />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders theme selector', () => {
    render(<SettingsView />);
    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('renders approval mode selector', () => {
    render(<SettingsView />);
    expect(screen.getByText('Approval Mode')).toBeInTheDocument();
  });

  it('renders max steps input', () => {
    render(<SettingsView />);
    expect(screen.getByText('Max Steps Per Task')).toBeInTheDocument();
  });

  it('commits max steps on blur', async () => {
    render(<SettingsView />);

    const maxStepsInput = screen.getByDisplayValue(String(DEFAULT_SETTINGS.maxStepsPerTask));
    fireEvent.change(maxStepsInput, { target: { value: '50' } });

    // Should NOT call IPC on change (only local state)
    expect(mockUpdateSettings).not.toHaveBeenCalled();

    // Commit on blur
    fireEvent.blur(maxStepsInput);

    await vi.waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ maxStepsPerTask: 50 });
    });
  });

  it('commits max steps on Enter key', async () => {
    render(<SettingsView />);

    const maxStepsInput = screen.getByDisplayValue(String(DEFAULT_SETTINGS.maxStepsPerTask));
    fireEvent.change(maxStepsInput, { target: { value: '30' } });
    fireEvent.keyDown(maxStepsInput, { key: 'Enter' });

    await vi.waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ maxStepsPerTask: 30 });
    });
  });

  it('resets invalid max steps on blur', () => {
    render(<SettingsView />);

    const maxStepsInput: HTMLInputElement = screen.getByDisplayValue(
      String(DEFAULT_SETTINGS.maxStepsPerTask),
    );
    fireEvent.change(maxStepsInput, { target: { value: '-5' } });
    fireEvent.blur(maxStepsInput);

    // Should reset to original value, not call IPC
    expect(mockUpdateSettings).not.toHaveBeenCalled();
    expect(maxStepsInput.value).toBe(String(DEFAULT_SETTINGS.maxStepsPerTask));
  });

  it('navigates back on Back button click', () => {
    render(<SettingsView />);

    fireEvent.click(screen.getByText('Back'));

    expect(useUIStore.getState().view).toBe('home');
  });

  it('shows error when IPC fails', async () => {
    mockUpdateSettings.mockResolvedValueOnce({
      success: false,
      error: { code: 'SAVE_FAILED', message: 'Disk full' },
    });

    render(<SettingsView />);

    const timeoutInput = screen.getByDisplayValue(String(DEFAULT_SETTINGS.networkTimeoutMs));
    fireEvent.change(timeoutInput, { target: { value: '5000' } });
    fireEvent.blur(timeoutInput);

    await vi.waitFor(() => {
      expect(screen.getByText('Disk full')).toBeInTheDocument();
    });
  });
});
