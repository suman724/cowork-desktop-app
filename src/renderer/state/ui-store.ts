import { create } from 'zustand';
import type { ViewName, AppSettings, PatchPreview } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

interface UIStore {
  view: ViewName;
  theme: AppSettings['theme'];
  settings: AppSettings;
  patchPreview: PatchPreview | null;

  setView: (view: ViewName) => void;
  setTheme: (theme: AppSettings['theme']) => void;
  setSettings: (settings: AppSettings) => void;
  setPatchPreview: (patch: PatchPreview | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  view: 'home',
  theme: DEFAULT_SETTINGS.theme,
  settings: DEFAULT_SETTINGS,
  patchPreview: null,

  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),
  setSettings: (settings) => set({ settings, theme: settings.theme }),
  setPatchPreview: (patchPreview) => set({ patchPreview }),
}));
