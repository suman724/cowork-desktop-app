import { create } from 'zustand';
import type { ViewName, AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

interface UIStore {
  view: ViewName;
  theme: AppSettings['theme'];
  settings: AppSettings;

  setView: (view: ViewName) => void;
  setTheme: (theme: AppSettings['theme']) => void;
  setSettings: (settings: AppSettings) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  view: 'history',
  theme: DEFAULT_SETTINGS.theme,
  settings: DEFAULT_SETTINGS,

  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),
  setSettings: (settings) => set({ settings, theme: settings.theme }),
}));
