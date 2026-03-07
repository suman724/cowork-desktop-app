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
  removeWorkspace: (workspaceId: string) => void;
  removeSession: (sessionId: string) => void;
  renameSession: (sessionId: string, name: string) => void;
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
  removeWorkspace: (workspaceId) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.workspaceId !== workspaceId),
      selectedWorkspaceId:
        state.selectedWorkspaceId === workspaceId ? null : state.selectedWorkspaceId,
    })),
  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
    })),
  renameSession: (sessionId, name) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionId === sessionId ? { ...s, name, autoNamed: false } : s,
      ),
    })),
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
