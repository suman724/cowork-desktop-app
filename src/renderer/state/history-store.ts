import { create } from 'zustand';
import type { Workspace, SessionSummary } from '../../shared/types';

interface HistoryStore {
  workspaces: Workspace[];
  sessions: SessionSummary[];
  selectedWorkspaceId: string | null;
  isLoadingWorkspaces: boolean;
  isLoadingSessions: boolean;
  error: string | null;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setSessions: (sessions: SessionSummary[]) => void;
  setSelectedWorkspaceId: (id: string | null) => void;
  setLoadingWorkspaces: (loading: boolean) => void;
  setLoadingSessions: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  workspaces: [],
  sessions: [],
  selectedWorkspaceId: null,
  isLoadingWorkspaces: false,
  isLoadingSessions: false,
  error: null,

  setWorkspaces: (workspaces) => set({ workspaces, error: null }),
  setSessions: (sessions) => set({ sessions, error: null }),
  setSelectedWorkspaceId: (selectedWorkspaceId) => set({ selectedWorkspaceId, sessions: [] }),
  setLoadingWorkspaces: (isLoadingWorkspaces) => set({ isLoadingWorkspaces }),
  setLoadingSessions: (isLoadingSessions) => set({ isLoadingSessions }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      workspaces: [],
      sessions: [],
      selectedWorkspaceId: null,
      isLoadingWorkspaces: false,
      isLoadingSessions: false,
      error: null,
    }),
}));
