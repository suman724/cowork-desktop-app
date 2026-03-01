/**
 * E2E test placeholder for the conversation flow.
 *
 * Full E2E tests require Playwright + Electron, which needs:
 * - electron-playwright driver
 * - AGENT_RUNTIME_PATH pointing to mock-agent-runtime.js
 *
 * This file provides the test skeleton. Run with: make test-e2e
 */

import { test } from '@playwright/test';

test.describe('Conversation flow', () => {
  test.skip('launches the app and shows history view', async () => {
    // TODO: Launch Electron app with Playwright
    // const electronApp = await electron.launch({ args: ['out/main/index.js'] });
    // const window = await electronApp.firstWindow();
    // await expect(window.locator('text=History')).toBeVisible();
    // await electronApp.close();
  });

  test.skip('creates a session and navigates to conversation', async () => {
    // TODO: Click "New Chat", verify session creation
  });

  test.skip('sends a prompt and receives streaming response', async () => {
    // TODO: Type prompt, submit, verify streaming text
  });

  test.skip('shows approval dialog', async () => {
    // TODO: Trigger approval, verify dialog
  });
});
