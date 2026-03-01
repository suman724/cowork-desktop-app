#!/usr/bin/env node

/**
 * Mock agent-runtime for E2E testing.
 *
 * Reads JSON-RPC requests from stdin (newline-delimited),
 * sends canned responses to stdout,
 * and emits SessionEvent notifications.
 */

const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  if (msg.id === undefined) return; // Ignore notifications from client

  const id = msg.id;
  const method = msg.method;

  switch (method) {
    case 'CreateSession': {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          session: {
            sessionId: 'test-session-1',
            workspaceId: 'test-workspace-1',
            tenantId: 'dev-tenant',
            userId: 'dev-user',
            status: 'active',
          },
          policyBundle: {
            policyBundleVersion: '1',
            schemaVersion: '2026.02.1',
            capabilities: [],
            llmPolicy: { maxOutputTokens: 40 },
          },
          workspaceId: 'test-workspace-1',
        },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      break;
    }

    case 'StartTask': {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: { status: 'started' } }) + '\n');

      // Simulate streaming response
      setTimeout(() => {
        const chunks = ['Hello', ', ', 'this is a ', 'test response.'];
        chunks.forEach((text, i) => {
          setTimeout(() => {
            const notification = {
              jsonrpc: '2.0',
              method: 'SessionEvent',
              params: {
                eventType: 'text_chunk',
                sessionId: 'test-session-1',
                payload: { text },
              },
            };
            process.stdout.write(JSON.stringify(notification) + '\n');

            if (i === chunks.length - 1) {
              const complete = {
                jsonrpc: '2.0',
                method: 'SessionEvent',
                params: {
                  eventType: 'step_completed',
                  sessionId: 'test-session-1',
                  payload: {},
                },
              };
              process.stdout.write(JSON.stringify(complete) + '\n');
            }
          }, i * 50);
        });
      }, 100);
      break;
    }

    case 'CancelTask': {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: { status: 'cancelled' } }) + '\n');
      break;
    }

    case 'GetSessionState': {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: {
            session: { sessionId: 'test-session-1', status: 'active' },
          },
        }) + '\n',
      );
      break;
    }

    case 'Shutdown': {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: {} }) + '\n');
      setTimeout(() => process.exit(0), 100);
      break;
    }

    default: {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        }) + '\n',
      );
    }
  }
});

rl.on('close', () => {
  process.exit(0);
});

process.stderr.write('[mock-agent-runtime] Ready\n');
