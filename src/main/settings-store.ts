import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { app } from 'electron';
import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

const SETTINGS_FILENAME = 'settings.json';

/**
 * Persists application settings as a JSON file in the user data directory.
 */
export class SettingsStore {
  private settings: AppSettings;
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? join(app.getPath('userData'), SETTINGS_FILENAME);
    this.settings = this.load();
  }

  /** Get current settings */
  get(): AppSettings {
    return { ...this.settings };
  }

  /** Update settings (partial merge) and persist to disk */
  update(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    this.save();
    return this.get();
  }

  /** Reset to defaults */
  reset(): AppSettings {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    return this.get();
  }

  private load(): AppSettings {
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_SETTINGS, ...(parsed as Partial<AppSettings>) };
      }
    } catch {
      // File doesn't exist or is invalid — use defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('[SettingsStore] Failed to save settings:', err);
    }
  }
}
