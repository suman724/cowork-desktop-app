import type {
  Workspace,
  SessionSummary,
  ListSessionsResponse,
  ConversationMessage,
} from '../shared/types';

interface WorkspaceServiceConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  authToken?: string;
}

const DEFAULT_CONFIG: WorkspaceServiceConfig = {
  baseUrl: 'http://localhost:8002',
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
    const url = `${this.config.baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/sessions?limit=100`;
    const response = await this.fetchWithRetry<ListSessionsResponse>(url);
    return response.sessions;
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
          const headers: Record<string, string> = { Accept: 'application/json' };
          if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
          }

          const response = await fetch(url, {
            signal: controller.signal,
            headers,
          });

          if (!response.ok) {
            const body = await response.text().catch(() => '');
            const err = new Error(`HTTP ${response.status}: ${body.slice(0, 1000)}`);
            (err as Error & { statusCode: number }).statusCode = response.status;
            throw err;
          }

          return (await response.json()) as T;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on client errors (4xx)
        const statusCode = (lastError as Error & { statusCode?: number }).statusCode;
        if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
          throw lastError;
        }

        // Exponential backoff with jitter
        if (attempt < this.config.maxRetries - 1) {
          const baseDelay = 500 * Math.pow(2, attempt);
          const jitter = Math.random() * baseDelay * 0.5;
          await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
        }
      }
    }

    // Provide a friendlier message for connection errors
    if (lastError?.message === 'fetch failed' || lastError?.cause) {
      const cause = lastError.cause;
      if (
        cause instanceof Error &&
        'code' in cause &&
        (cause as Error & { code: string }).code === 'ECONNREFUSED'
      ) {
        throw new Error(
          `Cannot connect to Workspace Service at ${this.config.baseUrl}. Is it running?`,
        );
      }
    }

    throw lastError ?? new Error('All retries exhausted');
  }
}
