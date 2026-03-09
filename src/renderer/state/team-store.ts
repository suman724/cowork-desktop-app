import { create } from 'zustand';
import type {
  TeamInfo,
  TeamMember,
  TeamTask,
  TeamMessage,
  TeammateToolActivity,
} from '../../shared/types';

interface TeamStore {
  /** Active team info (null when no team) */
  team: TeamInfo | null;
  /** Team members indexed by name */
  members: TeamMember[];
  /** Shared task list */
  tasks: TeamTask[];
  /** Inter-agent message feed */
  messages: TeamMessage[];
  /** Per-teammate streaming output buffers (name → text) */
  teammateOutput: Record<string, string>;
  /** Per-teammate current tool activity (name → latest tool) */
  teammateTools: Record<string, TeammateToolActivity>;

  // Actions
  setTeam: (team: TeamInfo) => void;
  clearTeam: () => void;
  addMember: (member: TeamMember) => void;
  removeMember: (name: string) => void;
  upsertTask: (task: TeamTask) => void;
  addMessage: (msg: TeamMessage) => void;
  appendTeammateOutput: (name: string, text: string) => void;
  setTeammateTool: (name: string, tool: TeammateToolActivity) => void;
  reset: () => void;
}

let messageCounter = 0;

export const useTeamStore = create<TeamStore>((set) => ({
  team: null,
  members: [],
  tasks: [],
  messages: [],
  teammateOutput: {},
  teammateTools: {},

  setTeam: (team) => set({ team }),

  clearTeam: () =>
    set({
      team: null,
      members: [],
      tasks: [],
      messages: [],
      teammateOutput: {},
      teammateTools: {},
    }),

  addMember: (member) =>
    set((state) => ({
      members: [...state.members.filter((m) => m.name !== member.name), member],
    })),

  removeMember: (name) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.name === name ? { ...m, status: 'stopped' as const } : m,
      ),
    })),

  upsertTask: (task) =>
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.task_id === task.task_id);
      if (idx >= 0) {
        const updated = [...state.tasks];
        updated[idx] = task;
        return { tasks: updated };
      }
      return { tasks: [...state.tasks, task] };
    }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  appendTeammateOutput: (name, text) =>
    set((state) => ({
      teammateOutput: {
        ...state.teammateOutput,
        [name]: (state.teammateOutput[name] ?? '') + text,
      },
    })),

  setTeammateTool: (name, tool) =>
    set((state) => ({
      teammateTools: {
        ...state.teammateTools,
        [name]: tool,
      },
    })),

  reset: () => {
    messageCounter = 0;
    return {
      team: null,
      members: [],
      tasks: [],
      messages: [],
      teammateOutput: {},
      teammateTools: {},
    };
  },
}));

/** Generate a unique message ID for team messages. */
export function nextTeamMessageId(): string {
  return `tm-${String(++messageCounter)}`;
}
