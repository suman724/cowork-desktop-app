import { useCallback } from 'react';
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
import type { AppSettings } from '../../../shared/types';

export function SettingsView(): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await window.coworkIPC.updateSettings({ [key]: value });
    },
    [settings, setSettings],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">Settings</h1>
        <Button variant="ghost" size="sm" onClick={() => setView('history')}>
          Back
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-lg space-y-6">
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
              value={settings.maxStepsPerTask}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  void updateSetting('maxStepsPerTask', val);
                }
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
              value={settings.networkTimeoutMs}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1000) {
                  void updateSetting('networkTimeoutMs', val);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
