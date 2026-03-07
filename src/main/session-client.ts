interface SessionServiceConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  authToken?: string;
}

const DEFAULT_CONFIG: SessionServiceConfig = {
  baseUrl: 'http://localhost:8001',
  timeoutMs: 5_000,
  maxRetries: 2,
};

/**
 * HTTPS REST client for the Session Service.
 * Minimal client — currently only supports renaming sessions.
 */
export class SessionServiceClient {
  private config: SessionServiceConfig;

  constructor(config?: Partial<SessionServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateConfig(config: Partial<SessionServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update a session's name.
   */
  async updateSessionName(sessionId: string, name: string, autoNamed: boolean): Promise<void> {
    const url = `${this.config.baseUrl}/sessions/${encodeURIComponent(sessionId)}/name`;
    await this.fetchWithRetry(url, 'PATCH', { name, autoNamed });
  }

  private async fetchWithRetry(
    url: string,
    method: string = 'GET',
    body?: Record<string, unknown>,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

        try {
          const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          };
          if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
          }

          const response = await fetch(url, {
            method,
            signal: controller.signal,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });

          if (!response.ok) {
            const text = await response.text().catch(() => '');
            const err = new Error(`HTTP ${response.status}: ${text.slice(0, 1000)}`);
            (err as Error & { statusCode: number }).statusCode = response.status;
            throw err;
          }

          return;
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
          `Cannot connect to Session Service at ${this.config.baseUrl}. Is it running?`,
        );
      }
    }

    throw lastError ?? new Error('All retries exhausted');
  }
}
