import { create } from 'zustand';
import type {
  SessionState,
  TaskState,
  AgentRuntimeStatus,
  DisplayMessage,
} from '../../shared/types';

interface SessionStore {
  sessionState: SessionState | null;
  taskState: TaskState | null;
  agentRuntimeStatus: AgentRuntimeStatus;
  error: string | null;
  /** Local project path for workspace resolution (null = general workspace) */
  workspacePath: string | null;
  /** True when viewing a historical session (not a live one) */
  isViewingHistory: boolean;
  /** Saved live session ID + messages when navigating to history */
  liveSessionId: string | null;
  liveSessionMessages: DisplayMessage[] | null;
  liveTaskState: TaskState | null;

  setSessionState: (state: SessionState | null) => void;
  setTaskState: (state: TaskState | null) => void;
  updateTaskStep: (step: number) => void;
  setTaskRunning: (running: boolean) => void;
  setAgentRuntimeStatus: (status: AgentRuntimeStatus) => void;
  setError: (error: string | null) => void;
  setWorkspacePath: (path: string | null) => void;
  setViewingHistory: (viewing: boolean) => void;
  /** Save the current live session's messages before navigating to history */
  saveLiveSession: (
    sessionId: string,
    messages: DisplayMessage[],
    taskState: TaskState | null,
  ) => void;
  /** Clear saved live session (e.g., on new session creation) */
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
  liveSessionMessages: null,
  liveTaskState: null,

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
  saveLiveSession: (sessionId, messages, taskState) =>
    set({ liveSessionId: sessionId, liveSessionMessages: messages, liveTaskState: taskState }),
  clearLiveSession: () =>
    set({ liveSessionId: null, liveSessionMessages: null, liveTaskState: null }),
  reset: () =>
    set({
      sessionState: null,
      taskState: null,
      agentRuntimeStatus: 'stopped',
      error: null,
      workspacePath: null,
      isViewingHistory: false,
      liveSessionId: null,
      liveSessionMessages: null,
      liveTaskState: null,
    }),
}));
