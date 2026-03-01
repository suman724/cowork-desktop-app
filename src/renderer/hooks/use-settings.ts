import { useState, useCallback, useEffect } from 'react';
import type { IpcResponse, AppSettings } from '../../shared/types';
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
      const result: IpcResponse<AppSettings> = await window.coworkIPC.getSettings();
      if (result.success) {
        setSettings(result.data);
      }
    };
    void load();
  }, [setSettings]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setIsLoading(true);
      setError(null);

      const updated = { ...settings, [key]: value };
      setSettings(updated);

      const result: IpcResponse<AppSettings> = await window.coworkIPC.updateSettings({
        [key]: value,
      });

      if (!result.success) {
        setError(result.error.message);
      }

      setIsLoading(false);
    },
    [settings, setSettings],
  );

  return { settings, updateSetting, isLoading, error };
}
