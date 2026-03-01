import { create } from 'zustand';
import type { SessionState, TaskState, AgentRuntimeStatus } from '../../shared/types';

interface SessionStore {
  sessionState: SessionState | null;
  taskState: TaskState | null;
  agentRuntimeStatus: AgentRuntimeStatus;
  error: string | null;

  setSessionState: (state: SessionState | null) => void;
  setTaskState: (state: TaskState | null) => void;
  updateTaskStep: (step: number) => void;
  setTaskRunning: (running: boolean) => void;
  setAgentRuntimeStatus: (status: AgentRuntimeStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionState: null,
  taskState: null,
  agentRuntimeStatus: 'stopped',
  error: null,

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
  reset: () => set({ sessionState: null, taskState: null, error: null }),
}));
