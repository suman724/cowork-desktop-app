import type { ApprovalRequest, ConversationMessage, Workspace } from '@cowork/platform';

/** Agent runtime process status */
export type AgentRuntimeStatus = 'stopped' | 'starting' | 'running' | 'crashed' | 'reconnecting';

/** Incomplete task detected during crash recovery */
export interface IncompleteTask {
  taskId: string;
  prompt: string;
  lastStep: number;
  maxSteps: number;
}

/** Session state as seen by the desktop app (matches CreateSession JSON-RPC response) */
export interface SessionState {
  sessionId: string;
  workspaceId: string;
  name?: string;
  logDir?: string;
  status: string;
  incompleteTask?: IncompleteTask;
}

/** Task execution state */
export interface TaskState {
  taskId: string;
  sessionId: string;
  prompt: string;
  currentStep: number;
  maxSteps: number;
  isRunning: boolean;
}

/** A single file diff in a patch preview */
export interface FileDiff {
  filePath: string;
  status: 'added' | 'modified' | 'deleted';
  hunks: string;
}

/** Patch preview for the diff viewer */
export interface PatchPreview {
  taskId: string;
  files: FileDiff[];
}

/** Application settings persisted to disk */
export interface AppSettings {
  approvalMode: 'always' | 'on_risky_actions' | 'never';
  maxStepsPerTask: number;
  theme: 'light' | 'dark' | 'system';
  workspaceServiceUrl: string;
  sessionServiceUrl: string;
  networkTimeoutMs: number;
  tenantId?: string;
  userId?: string;
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  approvalMode: 'on_risky_actions',
  maxStepsPerTask: 40,
  theme: 'system',
  workspaceServiceUrl: 'http://localhost:8002',
  sessionServiceUrl: 'http://localhost:8000',
  networkTimeoutMs: 30_000,
  tenantId: 'dev-tenant',
  userId: 'dev-user',
};

/** All navigable views */
export type ViewName = 'home' | 'conversation' | 'patch' | 'settings';

/** Wrapper for IPC results — never throws across the bridge */
export type IpcResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, unknown> } };

/** Message as displayed in the UI (extends the contract type with UI state) */
export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
  severity?: 'info' | 'warning' | 'error';
}

/** Tool type classification for visual distinction */
export type ToolCallType = 'tool' | 'agent' | 'sub_agent' | 'skill';

/** Tool call display info */
export interface ToolCallInfo {
  id: string;
  toolName: string;
  toolType?: ToolCallType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'denied';
  arguments?: Record<string, unknown>;
  result?: string;
  error?: string;
}

/** A single step in the agent's plan */
export interface PlanStepInfo {
  index: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

/** Agent plan state for display */
export interface PlanInfo {
  goal: string;
  steps: PlanStepInfo[];
}

/** Session event received from agent runtime via JSON-RPC notification */
export interface SessionEvent {
  eventType: string;
  sessionId: string;
  taskId?: string;
  stepId?: string;
  severity?: 'info' | 'warning' | 'error';
  payload: Record<string, unknown>;
}

/** History types for workspace/session browsing */
export interface WorkspaceSummary {
  workspace: Workspace;
  sessionCount: number;
  lastActiveAt: string;
}

/** Session summary as returned by GET /workspaces/{workspaceId}/sessions */
export interface SessionSummary {
  sessionId: string;
  name?: string;
  autoNamed?: boolean;
  createdAt: string;
  lastTaskAt: string;
  taskCount: number;
}

/** Paginated response from the workspace sessions endpoint */
export interface ListSessionsResponse {
  sessions: SessionSummary[];
  nextToken?: string;
}

export type { ApprovalRequest, ConversationMessage, Workspace };
