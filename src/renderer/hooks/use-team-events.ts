import { useEffect } from 'react';
import type { TeamEvent } from '../../shared/types';
import { useTeamStore, nextTeamMessageId } from '../state/team-store';

/**
 * Team event method constants matching the agent runtime's team/* notifications.
 */
const TEAM_METHOD = {
  CREATED: 'team/created',
  TEAMMATE_CREATED: 'team/teammate_created',
  TEAMMATE_REMOVED: 'team/teammate_removed',
  TASK_UPDATED: 'team/task_updated',
  MESSAGE: 'team/message',
  TEAMMATE_OUTPUT: 'team/teammate_output',
} as const;

/**
 * Hook that listens for team events from the agent runtime
 * and dispatches them to the team Zustand store.
 */
export function useTeamEvents(): void {
  const setTeam = useTeamStore((s) => s.setTeam);
  const addMember = useTeamStore((s) => s.addMember);
  const removeMember = useTeamStore((s) => s.removeMember);
  const upsertTask = useTeamStore((s) => s.upsertTask);
  const addMessage = useTeamStore((s) => s.addMessage);
  const appendTeammateOutput = useTeamStore((s) => s.appendTeammateOutput);

  useEffect(() => {
    const cleanup = window.coworkIPC.onTeamEvent((event: TeamEvent) => {
      const p = event.params;

      switch (event.method) {
        case TEAM_METHOD.CREATED: {
          const teamId = typeof p.teamId === 'string' ? p.teamId : '';
          const name = typeof p.name === 'string' ? p.name : '';
          if (teamId) {
            setTeam({ teamId, name });
          }
          break;
        }

        case TEAM_METHOD.TEAMMATE_CREATED: {
          const name = typeof p.name === 'string' ? p.name : '';
          const role = typeof p.role === 'string' ? p.role : '';
          if (name) {
            addMember({ name, role, status: 'running' });
          }
          break;
        }

        case TEAM_METHOD.TEAMMATE_REMOVED: {
          const name = typeof p.name === 'string' ? p.name : '';
          if (name) {
            removeMember(name);
          }
          break;
        }

        case TEAM_METHOD.TASK_UPDATED: {
          const task = typeof p.task === 'object' && p.task !== null ? p.task : null;
          if (task) {
            const t = task as Record<string, unknown>;
            upsertTask({
              task_id: typeof t.task_id === 'string' ? t.task_id : '',
              title: typeof t.title === 'string' ? t.title : '',
              status: typeof t.status === 'string' ? t.status : 'pending',
              assignee: typeof t.assignee === 'string' ? t.assignee : null,
              created_by: typeof t.created_by === 'string' ? t.created_by : undefined,
              result: typeof t.result === 'string' ? t.result : null,
            });
          }
          break;
        }

        case TEAM_METHOD.MESSAGE: {
          const from = typeof p.from === 'string' ? p.from : '';
          const to = typeof p.to === 'string' ? p.to : '';
          const content = typeof p.content === 'string' ? p.content : '';
          if (from && content) {
            addMessage({
              id: nextTeamMessageId(),
              from,
              to,
              content,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        }

        case TEAM_METHOD.TEAMMATE_OUTPUT: {
          const name = typeof p.name === 'string' ? p.name : '';
          const content = typeof p.content === 'string' ? p.content : '';
          if (name && content) {
            appendTeammateOutput(name, content);
          }
          break;
        }

        default:
          // Unknown team event — ignore
          break;
      }
    });

    return cleanup;
  }, [setTeam, addMember, removeMember, upsertTask, addMessage, appendTeammateOutput]);
}
