import { create } from 'zustand';
import type { SessionState, TaskState, AgentRuntimeStatus } from '../../shared/types';

interface SessionStore {
  sessionState: SessionState | null;
  taskState: TaskState | null;
  agentRuntimeStatus: AgentRuntimeStatus;
  error: string | null;
  /** Local project path for workspace resolution (null = general workspace) */
  workspacePath: string | null;
  /** True when viewing a historical session (not a live one) */
  isViewingHistory: boolean;
  /** The agent-runtime's active session — persists through sidebar navigation */
  liveSessionId: string | null;
  liveWorkspaceId: string | null;

  setSessionState: (state: SessionState | null) => void;
  setTaskState: (state: TaskState | null) => void;
  updateTaskStep: (step: number) => void;
  setTaskRunning: (running: boolean) => void;
  setAgentRuntimeStatus: (status: AgentRuntimeStatus) => void;
  setError: (error: string | null) => void;
  setWorkspacePath: (path: string | null) => void;
  setViewingHistory: (viewing: boolean) => void;
  /** Mark a session as the live agent-runtime session */
  setLiveSession: (sessionId: string, workspaceId: string) => void;
  clearLiveSession: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionState: null,
  taskState: null,
  agentRuntimeStatus: 'stopped',
  error: null,
  workspacePath: null,
  isViewingHistory: false,
  liveSessionId: null,
  liveWorkspaceId: null,

  setSessionState: (sessionState) => set({ sessionState, error: null }),
  setTaskState: (taskState) => set({ taskState }),
  updateTaskStep: (step) =>
    set((state) => ({
      taskState: state.taskState ? { ...state.taskState, currentStep: step } : null,
    })),
  setTaskRunning: (running) =>
    set((state) => ({
      taskState: state.taskState ? { ...state.taskState, isRunning: running } : null,
    })),
  setAgentRuntimeStatus: (agentRuntimeStatus) => set({ agentRuntimeStatus }),
  setError: (error) => set({ error }),
  setWorkspacePath: (workspacePath) => set({ workspacePath }),
  setViewingHistory: (isViewingHistory) => set({ isViewingHistory }),
  setLiveSession: (liveSessionId, liveWorkspaceId) => set({ liveSessionId, liveWorkspaceId }),
  clearLiveSession: () => set({ liveSessionId: null, liveWorkspaceId: null }),
  reset: () =>
    set({
      sessionState: null,
      taskState: null,
      agentRuntimeStatus: 'stopped',
      error: null,
      workspacePath: null,
      isViewingHistory: false,
      liveSessionId: null,
      liveWorkspaceId: null,
    }),
}));
