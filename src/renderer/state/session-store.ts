import { create } from 'zustand';
import type {
  SessionState,
  TaskState,
  AgentRuntimeStatus,
  IncompleteTask,
  PlanInfo,
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
  /** Prompt from the last recoverable task failure (for retry) */
  lastFailedPrompt: string | null;
  /** Incomplete task detected during crash recovery */
  incompleteTask: IncompleteTask | null;
  /** Whether the agent is currently in plan (read-only) mode */
  planMode: boolean;
  /** Whether the agent is currently in the verification phase */
  isVerifying: boolean;
  /** Current agent plan (null when no plan exists) */
  plan: PlanInfo | null;

  setSessionState: (state: SessionState | null) => void;
  setTaskState: (state: TaskState | null) => void;
  updateTaskStep: (step: number) => void;
  setTaskRunning: (running: boolean) => void;
  setAgentRuntimeStatus: (status: AgentRuntimeStatus) => void;
  setError: (error: string | null) => void;
  setWorkspacePath: (path: string | null) => void;
  setViewingHistory: (viewing: boolean) => void;
  setLastFailedPrompt: (prompt: string | null) => void;
  setIncompleteTask: (task: IncompleteTask | null) => void;
  setPlanMode: (planMode: boolean) => void;
  setVerifying: (verifying: boolean) => void;
  setPlan: (plan: PlanInfo | null) => void;
  updateSessionName: (name: string) => void;
  clearPlanState: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionState: null,
  taskState: null,
  agentRuntimeStatus: 'stopped',
  error: null,
  workspacePath: null,
  isViewingHistory: false,
  lastFailedPrompt: null,
  incompleteTask: null,
  planMode: false,
  isVerifying: false,
  plan: null,

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
  setLastFailedPrompt: (lastFailedPrompt) => set({ lastFailedPrompt }),
  setIncompleteTask: (incompleteTask) => set({ incompleteTask }),
  setPlanMode: (planMode) => set({ planMode }),
  setVerifying: (isVerifying) => set({ isVerifying }),
  setPlan: (plan) => set({ plan }),
  updateSessionName: (name) =>
    set((state) => ({
      sessionState: state.sessionState ? { ...state.sessionState, name } : null,
    })),
  clearPlanState: () => set({ plan: null, planMode: false, isVerifying: false }),
  reset: () =>
    set({
      sessionState: null,
      taskState: null,
      agentRuntimeStatus: 'stopped',
      error: null,
      workspacePath: null,
      isViewingHistory: false,
      lastFailedPrompt: null,
      incompleteTask: null,
      planMode: false,
      isVerifying: false,
      plan: null,
    }),
}));
