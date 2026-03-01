# Code Review: cowork-desktop-app

**Date:** 2026-03-01
**Scope:** Full codebase review — bugs, integration issues, test gaps
**Last verified:** 2026-03-01

### Status Summary

| Category | Fixed | Partially Fixed | Open | Total |
|----------|-------|-----------------|------|-------|
| P0 — Integration Breakers | 6 | 0 | 0 | 6 |
| P1 — High-Severity | 9 | 0 | 0 | 9 |
| P2 — Medium-Severity | 14 | 2 | 0 | 16 |
| P3 — Low-Severity | 9 | 1 | 1 | 11 |
| Test Coverage Gaps | 7 | 2 | 3 | 12 |
| **Total** | **45** | **5** | **4** | **54** |

---

## P0 — Bugs That Will Break Integration

### 1. `CreateSession` sends wrong parameter shapes — will be rejected by agent-runtime — FIXED

**`src/main/ipc-handlers.ts:61-68`**

Three contract mismatches vs the `SessionCreateRequest` in `@cowork/platform`:

| Field | Desktop sends | Contract expects |
|-------|--------------|-----------------|
| `workspaceHint` | `{ scope: string; localPath?: string }` | `{ localPaths?: string[] }` |
| `clientInfo` | `{ name, version }` | `{ desktopAppVersion, localAgentHostVersion, osFamily }` |
| `executionEnvironment` | *(missing)* | `"desktop"` (required) |
| `supportedCapabilities` | *(missing)* | `["File.Read", ...]` (required) |

The session creation RPC will fail or be rejected by the agent-runtime.

### 2. Missing `child.on('error')` handler — app crashes if agent-runtime binary doesn't exist — FIXED

**`src/main/agent-runtime.ts:53-56`**

`spawn()` emits an async `error` event (e.g., `ENOENT`) if the binary path is invalid. Without a handler, Node.js throws an uncaught exception, crashing the Electron app.

### 3. Graceful shutdown race — renderer gets `RUNTIME_CRASHED` on intentional shutdown — FIXED

**`src/main/agent-runtime.ts:77-89` vs `105-143`**

When `shutdown()` runs, the child process exits, the `exit` event handler fires, sees `status === 'running'`, sets status to `'crashed'`, and sends `RUNTIME_CRASHED` to the renderer — before `shutdown()` can set `'stopped'`. The user sees a crash notification for an intentional shutdown.

### 4. `maxSteps` is sourced from `maxOutputTokens` — completely wrong value — FIXED

**`src/renderer/views/conversation/ConversationView.tsx:26`** and **`src/renderer/hooks/use-start-task.ts:37`**

```typescript
maxSteps: sessionState.policyBundle.llmPolicy.maxOutputTokens,
```

`maxOutputTokens` is a token budget (e.g. 4096), not a step count (e.g. 40). The step counter would show "Step 3 of 4096".

### 5. Patch preview is permanently broken — `patchPreview` state is never populated — FIXED

**`src/renderer/App.tsx:17`**

```tsx
const [patchPreview] = useState<PatchPreview | null>(null);
```

The setter is discarded. `patchPreview` is always `null`. The patch view always shows "No changes to preview". Additionally, `use-patch-preview.ts` returns the data from the function but stores it nowhere — it's lost after the navigation to the patch view.

### 6. Task state never set after `startTask` — no cancel button, input never disabled, allows duplicate submissions — FIXED

**`src/renderer/views/conversation/ConversationView.tsx:20-32`**

After calling `window.coworkIPC.startTask(...)`, the component never calls `setTaskState(...)`. `isTaskRunning` stays `false`, so the prompt input is never disabled and the cancel button never appears.

---

## P1 — High-Severity Bugs

### 7. `before-quit` does not await shutdown — child process may be orphaned — FIXED

**`src/main/index.ts:62-64`**

```typescript
app.on('before-quit', () => {
  void runtimeManager.shutdown(); // fire-and-forget
});
```

The app quits before the 25-second shutdown sequence completes. The agent-runtime process may be orphaned.

### 8. JSON-RPC error `data` field silently lost end-to-end — FIXED

**`src/main/json-rpc-client.ts:151-153`** -> **`src/main/ipc-handlers.ts:27`**

The `JsonRpcClient` creates `new Error(msg.error.message)` and attaches `code`, but drops `msg.error.data`. The `rpcError()` function tries to read `data` but it's always `undefined`. Structured error context from the agent-runtime (which capability was denied, which file was blocked) is silently lost.

### 9. No `try/catch/finally` in any IPC hook — `isLoading` gets permanently stuck on IPC failure — FIXED

**All 6 hooks:** `use-create-session.ts`, `use-start-task.ts`, `use-cancel-task.ts`, `use-approval.ts`, `use-patch-preview.ts`, `use-settings.ts`

Pattern in all hooks:
```typescript
setIsLoading(true);
const result = await window.coworkIPC.something(...);
// ...
setIsLoading(false); // never reached if IPC throws
```

If the IPC bridge throws (channel not registered, main process crash), the UI permanently freezes in a loading state.

### 10. Approval resolution errors silently swallowed — queue advances even on failure — FIXED

**`src/renderer/views/approval/ApprovalDialog.tsx:24-33`**

The IPC result from `resolveApproval` is never checked. If the call fails, the approval is still removed from the queue and the agent-runtime is left waiting.

### 11. `POLICY_EXPIRED` event doesn't stop the task or finish streaming — FIXED

**`src/renderer/hooks/use-session-events.ts:120-124`**

Unlike `SESSION_COMPLETED` and `SESSION_FAILED`, the `POLICY_EXPIRED` handler does not call `setTaskRunning(false)` or `finishStreaming()`. The UI shows both an error message and an apparently still-running task.

### 12. `updateToolCall` equality check always false — unnecessary re-renders — FIXED

**`src/renderer/state/messages-store.ts:127`**

```typescript
if (updatedCalls === msg.toolCalls) return msg;
```

`Array.map()` always returns a new array, so this is always `false`. Every message with tool calls gets cloned on every `updateToolCall` call.

### 13. `addToolCall` silently drops tool calls if no assistant message exists yet — FIXED

**`src/renderer/state/messages-store.ts:103-116`**

If a `TOOL_REQUESTED` event arrives before any `text_chunk` (so there's no assistant message), the tool call is silently discarded.

### 14. Stale closure in `useSettings.updateSetting` — rapid updates overwrite each other — FIXED

**`src/renderer/hooks/use-settings.ts:34`**

```typescript
const updated = { ...settings, [key]: value };
```

`settings` is captured from the closure. If the user changes two settings rapidly (theme then approval mode), the second call uses the pre-first-update settings, overwriting the first change.

### 15. Selecting a session in history does nothing useful — FIXED

**`src/renderer/views/history/HistoryView.tsx:57-62`**

`handleSelectSession` just navigates to the conversation view without loading the session's message history or setting session state. The conversation view shows whatever was there before.

---

## P2 — Medium-Severity Issues

### 16. Falsy check instead of `!== undefined` for settings propagation — FIXED

**`src/main/ipc-handlers.ts:231`** — `if (params.workspaceServiceUrl || params.networkTimeoutMs)` — setting `networkTimeoutMs` to `0` or `workspaceServiceUrl` to `""` silently fails.

### 17. `StartTask` `taskOptions` incomplete — missing `approvalMode` and `allowNetwork` — FIXED

**`src/main/ipc-handlers.ts:104-108`** — Only sends `maxSteps`. The design doc shows `taskOptions` should also include `approvalMode` from user settings.

### 18. `step_limit_approaching` and `approval_resolved` events silently dropped — FIXED

**`src/renderer/hooks/use-session-events.ts`** — The design doc specifies a `step_limit_approaching` event (80% step limit) that should highlight the step counter, and `approval_resolved` for confirmation. Neither is handled.

### 19. No task-level completion events handled — FIXED

**`src/renderer/hooks/use-session-events.ts`** — Only `session_completed`/`session_failed` are handled. If a task ends but the session continues (multi-turn), there's no signal to reset task state.

### 20. Optimistic settings update not rolled back on failure — FIXED

**`src/renderer/hooks/use-settings.ts:29-46`** — On IPC failure, error is set but the UI still shows the new (unpersisted) value.

### 21. Settings saved on every keystroke for numeric inputs — FIXED

**`src/renderer/views/settings/SettingsView.tsx:91-96, 110-115`** — Typing "100" fires three IPC calls. Should debounce or use `onBlur`.

### 22. Auto-scroll disrupts user reading earlier messages — FIXED

**`src/renderer/views/conversation/MessageList.tsx:10-12`** — Scrolls to bottom on every messages array change, including tool call status updates. Should only auto-scroll if already near bottom.

### 23. `ErrorBoundary` doesn't wrap `ApprovalDialog` — FIXED

**`src/renderer/App.tsx:34`** — The `ApprovalDialog` is outside the `ErrorBoundary`. A rendering error in approval (e.g., malformed data) crashes the entire app.

### 24. Duplicate approval prevention missing — FIXED

**`src/renderer/state/approval-store.ts:25-32`** — If the same `APPROVAL_REQUESTED` event is delivered twice, the user is asked to approve twice.

### 25. `write()` on closed stdin could emit unhandled error — PARTIALLY FIXED

**`src/main/json-rpc-client.ts:96`** — No try/catch around `this.output.write(line)`. If the child dies mid-write, the error event is unhandled.

> Synchronous write errors are now caught via try/catch around `write()`, and `this.closed` is checked before writing. However, there is no `'error'` event listener on the output (writable) stream to handle asynchronous write failures.

### 26. No uncaught exception handler in main process — FIXED

**`src/main/index.ts`** — No `process.on('uncaughtException')`. Unhandled throws crash the app silently.

### 27. Hardcoded `dev-tenant`/`dev-user` in workspace fetch — PARTIALLY FIXED

**`src/renderer/views/history/HistoryView.tsx:23-24`** — Should come from settings or session state.

> Values now read from `useUIStore` settings (configurable via SettingsView), but `'dev-tenant'`/`'dev-user'` remain as fallback defaults via `??` operator.

### 28. 9 preload methods return `IpcResponse<unknown>` instead of typed responses — FIXED

**`src/main/preload.ts:13-49`** — Forces `as never` casts in the renderer (HistoryView.tsx:27,44), completely bypassing type safety.

### 29. No settings validation — either from IPC or from disk — FIXED

**`src/main/settings-store.ts:27-28, 44-45`** and **`src/main/ipc-handlers.ts:228`** — Invalid values (negative timeout, empty URL) propagate unchecked.

### 30. `session-store.reset()` doesn't reset `agentRuntimeStatus` — FIXED

**`src/renderer/state/session-store.ts:37`** — After reset, status could remain `'crashed'` or `'running'`.

### 31. Unsafe `as` casts on event payloads — no runtime validation — FIXED

**`src/renderer/hooks/use-session-events.ts:45,51,64,82,99,114`** — `event.payload` is `Record<string, unknown>`. The `ApprovalRequest` cast is especially dangerous — missing fields would propagate to the approval dialog.

---

## P3 — Low-Severity / Design Issues

| # | Location | Issue | Status |
|---|----------|-------|--------|
| 32 | `workspace-client.ts:86-88` | No retry jitter (violates production standards) | **FIXED** |
| 33 | `workspace-client.ts:81` | 4xx detection via string prefix matching is fragile | **FIXED** |
| 34 | `workspace-client.ts` | No authentication headers | **FIXED** |
| 35 | `settings-store.ts:42,56` | Synchronous file I/O blocks main process | **OPEN** |
| 36 | `json-rpc-client.ts:128` | JSON-RPC `jsonrpc: '2.0'` field not validated | **FIXED** |
| 37 | `messages-store.ts:32-36` | Module-level `messageCounter` not reset by `loadHistory()` | **FIXED** |
| 38 | `types.ts:71` | `DisplayMessage.role` missing `'tool'` role from contract | **FIXED** |
| 39 | `types.ts:55` | Default theme is `'dark'` but design doc says `'system'` | **FIXED** |
| 40 | `DiffViewer.tsx:27` | Line numbers are sequential, not actual source line numbers | **FIXED** |
| 41 | Various | Missing ARIA labels, focus-visible styles on buttons | **PARTIALLY FIXED** |
| 42 | `ConversationView.tsx:62` | "Create a session first" but no UI to do it | **FIXED** |

---

## Test Coverage Gaps

| Area | Coverage | Impact | Status |
|------|----------|--------|--------|
| `ipc-handlers.ts` (14 handlers) | **Zero** | Central routing, error translation untested | **FIXED** — 16 test cases |
| All 11 hooks | **Zero** | Every user interaction flow untested | **PARTIALLY FIXED** — 5/11 hooks tested |
| `AgentRuntimeManager` (spawn/shutdown/crash) | **Trivial getters only** | Most complex module effectively untested | **FIXED** — 15 test cases |
| ApprovalDialog "Deny" button | **Missing** | Critical interaction path | **FIXED** |
| ApprovalDialog IPC error handling | **Missing** | Errors silently swallowed | **FIXED** |
| SettingsView interactions | **Render-only** | No setting change tested | **FIXED** — 8 test cases |
| HistoryView loading/errors | **Render-only** | No data loading tested | **PARTIALLY FIXED** — basic render only |
| E2E tests | **All skipped** | Zero end-to-end coverage | **OPEN** — still all skipped |
| `messages-store.updateToolCall` optimization bug | **Not caught** | Test doesn't verify the `.map()===` issue | **OPEN** |
| `workspace-client` timeout/abort | **Missing** | AbortController never verified | **OPEN** |
| Concurrent JSON-RPC requests | **Missing** | Interleaved responses not tested | **FIXED** |
