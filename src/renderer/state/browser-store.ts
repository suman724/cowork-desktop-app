/**
 * Browser automation state — side panel, toggle, screenshots.
 */
import { create } from 'zustand';

import type { BrowserPageState, BrowserStatus } from '../../shared/types';

interface BrowserStore {
  /** Whether the user has enabled the browser toggle for this session */
  browserEnabled: boolean;

  /** Current browser lifecycle status */
  browserStatus: BrowserStatus;

  /** Current page URL (null if browser not active) */
  currentUrl: string | null;

  /** Current screenshot as base64 PNG (null if none) */
  currentScreenshot: string | null;

  /** Domains approved in this session (for display only) */
  approvedDomains: string[];

  /** Whether the browser side panel is open */
  panelOpen: boolean;

  /** Whether browser tools are available (based on session policy) */
  browserAvailable: boolean;

  // --- Actions ---
  setBrowserEnabled: (enabled: boolean) => void;
  setBrowserStatus: (status: BrowserStatus) => void;
  updatePageState: (state: BrowserPageState) => void;
  addApprovedDomain: (domain: string) => void;
  setPanelOpen: (open: boolean) => void;
  setBrowserAvailable: (available: boolean) => void;
  reset: () => void;
}

export const useBrowserStore = create<BrowserStore>((set) => ({
  browserEnabled: false,
  browserStatus: 'idle',
  currentUrl: null,
  currentScreenshot: null,
  approvedDomains: [],
  panelOpen: false,
  browserAvailable: false,

  setBrowserEnabled: (enabled) => set({ browserEnabled: enabled }),
  setBrowserStatus: (status) => set({ browserStatus: status }),
  updatePageState: ({ url, screenshotBase64 }) =>
    set({ currentUrl: url, currentScreenshot: screenshotBase64 }),
  addApprovedDomain: (domain) =>
    set((state) => ({
      approvedDomains: state.approvedDomains.includes(domain)
        ? state.approvedDomains
        : [...state.approvedDomains, domain],
    })),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setBrowserAvailable: (available) => set({ browserAvailable: available }),
  reset: () =>
    set({
      browserEnabled: false,
      browserStatus: 'idle',
      currentUrl: null,
      currentScreenshot: null,
      approvedDomains: [],
      panelOpen: false,
      browserAvailable: false,
    }),
}));
