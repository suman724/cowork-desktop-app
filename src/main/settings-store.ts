import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { app } from 'electron';
import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

const SETTINGS_FILENAME = 'settings.json';

const VALID_THEMES = new Set(['light', 'dark', 'system']);
const VALID_APPROVAL_MODES = new Set(['always', 'on_risky_actions', 'never']);

/**
 * Validate and clamp settings values.
 * Returns a sanitized copy merged with defaults for any missing/invalid fields.
 */
function validateSettings(raw: Record<string, unknown>): AppSettings {
  const settings = { ...DEFAULT_SETTINGS };

  if (typeof raw.theme === 'string' && VALID_THEMES.has(raw.theme)) {
    settings.theme = raw.theme as AppSettings['theme'];
  }

  if (typeof raw.approvalMode === 'string' && VALID_APPROVAL_MODES.has(raw.approvalMode)) {
    settings.approvalMode = raw.approvalMode as AppSettings['approvalMode'];
  }

  if (typeof raw.maxStepsPerTask === 'number' && raw.maxStepsPerTask >= 1) {
    settings.maxStepsPerTask = Math.min(Math.round(raw.maxStepsPerTask), 200);
  }

  if (typeof raw.networkTimeoutMs === 'number' && raw.networkTimeoutMs >= 1000) {
    settings.networkTimeoutMs = Math.min(Math.round(raw.networkTimeoutMs), 120_000);
  }

  if (typeof raw.workspaceServiceUrl === 'string' && raw.workspaceServiceUrl.length > 0) {
    settings.workspaceServiceUrl = raw.workspaceServiceUrl;
  }

  if (typeof raw.tenantId === 'string' && raw.tenantId.length > 0) {
    settings.tenantId = raw.tenantId;
  }

  if (typeof raw.userId === 'string' && raw.userId.length > 0) {
    settings.userId = raw.userId;
  }

  return settings;
}

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
    const merged = { ...this.settings, ...partial };
    this.settings = validateSettings(merged as Record<string, unknown>);
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
        return validateSettings(parsed as Record<string, unknown>);
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
