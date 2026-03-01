import { useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { useUIStore } from '../../state/ui-store';
import { useSessionStore } from '../../state/session-store';
import { useSettings } from '../../hooks/use-settings';
import type { AppSettings } from '../../../shared/types';

export function SettingsView(): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);
  const logDir = useSessionStore((s) => s.sessionState?.logDir);
  const { settings, updateSetting, error } = useSettings();

  // Local state for numeric inputs — only commit on blur
  const [localMaxSteps, setLocalMaxSteps] = useState(String(settings.maxStepsPerTask));
  const [localTimeout, setLocalTimeout] = useState(String(settings.networkTimeoutMs));

  const commitMaxSteps = useCallback(() => {
    const val = parseInt(localMaxSteps, 10);
    if (!isNaN(val) && val > 0 && val <= 200) {
      void updateSetting('maxStepsPerTask', val);
    } else {
      // Reset to current setting on invalid input
      setLocalMaxSteps(String(settings.maxStepsPerTask));
    }
  }, [localMaxSteps, settings.maxStepsPerTask, updateSetting]);

  const commitTimeout = useCallback(() => {
    const val = parseInt(localTimeout, 10);
    if (!isNaN(val) && val >= 1000 && val <= 120000) {
      void updateSetting('networkTimeoutMs', val);
    } else {
      setLocalTimeout(String(settings.networkTimeoutMs));
    }
  }, [localTimeout, settings.networkTimeoutMs, updateSetting]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Settings</h1>
        <Button variant="ghost" size="sm" onClick={() => setView('home')}>
          Back
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-lg space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded p-3 text-sm">{error}</div>
          )}

          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => void updateSetting('theme', v as AppSettings['theme'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Approval mode */}
          <div className="space-y-2">
            <Label>Approval Mode</Label>
            <Select
              value={settings.approvalMode}
              onValueChange={(v) =>
                void updateSetting('approvalMode', v as AppSettings['approvalMode'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always ask</SelectItem>
                <SelectItem value="on_risky_actions">Risky actions only</SelectItem>
                <SelectItem value="never">Never ask</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Max steps */}
          <div className="space-y-2">
            <Label>Max Steps Per Task</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={localMaxSteps}
              onChange={(e) => setLocalMaxSteps(e.target.value)}
              onBlur={commitMaxSteps}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitMaxSteps();
              }}
            />
          </div>

          <Separator />

          {/* Network timeout */}
          <div className="space-y-2">
            <Label>Network Timeout (ms)</Label>
            <Input
              type="number"
              min={1000}
              max={120000}
              value={localTimeout}
              onChange={(e) => setLocalTimeout(e.target.value)}
              onBlur={commitTimeout}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTimeout();
              }}
            />
          </div>

          {logDir && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Diagnostics</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void window.coworkIPC.openLogFolder(logDir)}
                  data-testid="open-log-folder"
                >
                  Open Log Folder
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
