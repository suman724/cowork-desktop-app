import { useState, useCallback, useEffect } from 'react';
import type { AppSettings } from '../../shared/types';
import { useUIStore } from '../state/ui-store';

interface UseSettings {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useSettings(): UseSettings {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  // Load settings from main process on mount
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const result = await window.coworkIPC.getSettings();
        if (result.success) {
          setSettings(result.data);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    void load();
  }, [setSettings]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setIsLoading(true);
      setError(null);

      // Read current settings from store to avoid stale closure
      const currentSettings = useUIStore.getState().settings;
      const updated = { ...currentSettings, [key]: value };
      setSettings(updated);

      try {
        const result = await window.coworkIPC.updateSettings({
          [key]: value,
        });

        if (!result.success) {
          // Rollback on failure
          setSettings(currentSettings);
          setError(result.error.message);
        }
      } catch (err) {
        // Rollback on exception
        setSettings(currentSettings);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [setSettings],
  );

  return { settings, updateSetting, isLoading, error };
}
