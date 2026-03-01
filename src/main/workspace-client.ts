import type { Workspace, SessionSummary, ConversationMessage } from '../shared/types';

interface WorkspaceServiceConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: WorkspaceServiceConfig = {
  baseUrl: 'http://localhost:8003',
  timeoutMs: 30_000,
  maxRetries: 3,
};

/**
 * HTTPS REST client for the Workspace Service.
 * Used for browsing history when not in an active session.
 */
export class WorkspaceServiceClient {
  private config: WorkspaceServiceConfig;

  constructor(config?: Partial<WorkspaceServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateConfig(config: Partial<WorkspaceServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * List workspaces for a tenant/user.
   */
  async listWorkspaces(tenantId: string, userId: string): Promise<Workspace[]> {
    const url = `${this.config.baseUrl}/workspaces?tenantId=${encodeURIComponent(tenantId)}&userId=${encodeURIComponent(userId)}`;
    return this.fetchWithRetry<Workspace[]>(url);
  }

  /**
   * List sessions for a workspace.
   */
  async listSessions(workspaceId: string): Promise<SessionSummary[]> {
    const url = `${this.config.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/sessions`;
    return this.fetchWithRetry<SessionSummary[]>(url);
  }

  /**
   * Get conversation history for a session.
   */
  async getSessionHistory(workspaceId: string, sessionId: string): Promise<ConversationMessage[]> {
    const url = `${this.config.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}/history`;
    return this.fetchWithRetry<ConversationMessage[]>(url);
  }

  private async fetchWithRetry<T>(url: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
          }

          return (await response.json()) as T;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on client errors (4xx)
        if (lastError.message.startsWith('HTTP 4')) {
          throw lastError;
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms...
        if (attempt < this.config.maxRetries - 1) {
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('All retries exhausted');
  }
}
