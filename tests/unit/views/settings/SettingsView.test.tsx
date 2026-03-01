import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUIStore } from '../../../../src/renderer/state/ui-store';
import { SettingsView } from '../../../../src/renderer/views/settings/SettingsView';
import { DEFAULT_SETTINGS } from '../../../../src/shared/types';

// Mock window.coworkIPC
Object.defineProperty(window, 'coworkIPC', {
  value: {
    updateSettings: vi.fn().mockResolvedValue({ success: true, data: DEFAULT_SETTINGS }),
  },
  writable: true,
  configurable: true,
});

describe('SettingsView', () => {
  beforeEach(() => {
    useUIStore.getState().setSettings(DEFAULT_SETTINGS);
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
});
