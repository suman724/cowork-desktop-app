# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

`cowork-desktop-app` is the Electron/React desktop application for Windows and macOS. It provides the conversation UI, renders approval dialogs, previews file changes, and manages the `cowork-agent-runtime` lifecycle. It contains **no business logic** — everything is delegated to the agent-runtime via JSON-RPC.

## Architecture

The app follows a strict main/renderer process split with a typed preload bridge in between.

**Main process** (`src/main/`) — Node.js, runs with full OS access:
- `index.ts` — App entry: window creation, IPC registration, runtime/client wiring, lifecycle
- `agent-runtime.ts` — `AgentRuntimeManager`: spawns `cowork-agent-runtime` binary, monitors for crashes, graceful shutdown (Shutdown RPC → 10s → SIGTERM → 5s → SIGKILL)
- `json-rpc-client.ts` — `JsonRpcClient`: newline-delimited JSON-RPC 2.0 over child stdio, request/response matching, notification dispatch, configurable timeouts
- `workspace-client.ts` — `WorkspaceServiceClient`: Node 22 `fetch` with 3-retry exponential backoff for Workspace Service REST API
- `settings-store.ts` — `SettingsStore`: persists `AppSettings` as JSON in `app.getPath('userData')`
- `preload.ts` — `contextBridge.exposeInMainWorld('coworkIPC', {...})` — the sole bridge, typed via `CoworkIPC` interface
- `ipc-handlers.ts` — `registerIpcHandlers()`: maps all `IPC_CHANNELS` to `ipcMain.handle`, wraps results in `IpcResponse<T>`

**Renderer process** (`src/renderer/`) — React 19, sandboxed, no Node.js APIs:
- `App.tsx` — View router, global event hooks, approval modal overlay
- `state/` — 6 Zustand stores: session (includes `planMode`, `isVerifying`, `plan: PlanInfo | null`), messages (streaming accumulation), approval (FIFO queue), history, ui, team (members, tasks, messages, teammate output)
- `hooks/` — 12 hooks: 3 event dispatchers (`useSessionEvents`, `useTeamEvents`, `useAgentRuntimeEvents`) + 9 IPC wrappers with loading/error state
- `views/` — 6 view groups: conversation (9 components including MarkdownRenderer and PlanPanel), team (4: TeamView, TeammatePanel, TaskBoardView, TeamMessageFeed), history (6), approval (2), patch (3), settings (1)
- `components/` — Shared: `ErrorBoundary`, `ThemeProvider`, `AppLayout`, `StatusIndicator` + 17 shadcn/ui primitives in `ui/`

**Shared** (`src/shared/`) — Imported by both processes:
- `types.ts` — `SessionState`, `TaskState`, `AgentRuntimeStatus`, `IpcResponse<T>`, `DisplayMessage`, `ToolCallInfo`, `SessionEvent`, `TeamEvent`, `TeamMember`, `TeamTask`, `TeamMessage`, `TeamInfo`, `AppSettings`, `PlanInfo`, `PlanStepInfo` + re-exports from `@cowork/platform`
- `ipc-channels.ts` — `IPC_CHANNELS` (15 invoke channels) + `IPC_EVENTS` (4 push channels) as const objects

## Key Constraints

- **No direct imports from `cowork-agent-runtime`** — all communication is JSON-RPC 2.0 over stdio.
- **Depends on `@cowork/platform`** (npm package) for generated model types (`Session`, `PolicyBundle`, `ApprovalRequest`, etc.). SDK constants are not re-exported from platform's main entry — event type constants are defined locally in `use-session-events.ts`.
- **Renderer never calls JSON-RPC directly** — all proxied through preload bridge + `ipcMain.handle`.
- **IPC uses result wrappers, never throws** — every handler returns `IpcResponse<T>` (`{ success, data } | { success, error }`).
- **Streaming text accumulation in Zustand** — `text_chunk` events append to current assistant message via `messagesStore.appendTextChunk()`.
- **Settings validation** — `SettingsStore.update()` clamps numeric ranges and rejects invalid enum values via `validateSettings()`.
- **JSON-RPC version validation** — `JsonRpcClient` validates `jsonrpc: '2.0'` on all incoming messages before processing.
- **Event payload runtime validation** — `use-session-events.ts` uses `typeof` checks on every payload field instead of unsafe `as` casts. Handles `plan_updated` events by validating the payload and calling `sessionStore.setPlan()`.
- **PlanPanel** — collapsible panel rendered between `ConversationHeader` and `MessageList`, showing plan goal with progress counter [completed/total] and step list with status icons (spinner=in_progress, check=completed, ban=skipped, circle=pending). Skipped steps shown with strikethrough. Auto-collapses at 7+ steps. Plan state (`PlanInfo | null`) stored in session-store, cleared on task reset.
- **Plan mode toggle** — "Plan first" toggle button (checklist icon) in `PromptInput` next to the send button. When active, sends `taskOptions.planOnly: true` in `StartTask`, locking the agent into read-only plan mode for the task. Toggle state is local to the component (not persisted).
- **Team View** — when the agent creates a team (via `CreateTeam` tool), the agent runtime sends `team/*` JSON-RPC notifications. These are forwarded via `push:team-event` IPC channel to the renderer, where `useTeamEvents` hook dispatches them to `team-store`. The `TeamView` component renders below the lead conversation with: teammate output panels (`TeammatePanel`), shared task board (`TaskBoardView`), and inter-agent message feed (`TeamMessageFeed`). Team state is cleared when the session ends. The 6 team notification methods are: `team/created`, `team/teammate_created`, `team/teammate_removed`, `team/task_updated`, `team/message`, `team/teammate_output`.
- All views read/write through Zustand stores for consistent UI state.

## IPC Channels

**Invoke channels** (renderer → main → agent-runtime or workspace service):

| Channel | JSON-RPC Method / Action |
|---------|-------------------------|
| `session:create` | `CreateSession` (60s timeout) |
| `session:resume` | `ResumeSession` (60s timeout) |
| `session:get-state` | `GetSessionState` |
| `task:start` | `StartTask` |
| `task:cancel` | `CancelTask` |
| `approval:resolve` | `ApproveAction` |
| `patch:get-preview` | `GetPatchPreview` |
| `workspace:list` | WorkspaceService REST |
| `workspace:list-sessions` | WorkspaceService REST |
| `workspace:get-session-history` | WorkspaceService REST |
| `workspace:delete` | WorkspaceService REST |
| `workspace:delete-session` | WorkspaceService REST |
| `settings:get` | Local SettingsStore |
| `settings:update` | Local SettingsStore |
| `runtime:status` | AgentRuntimeManager |
| `runtime:shutdown` | AgentRuntimeManager |
| `app:get-version` | Electron `app.getVersion()` |

**Push events** (main → renderer via `webContents.send`):
- `push:session-event` — `SessionEvent` notifications from agent-runtime (`SessionEvent` method)
- `push:team-event` — `TeamEvent` notifications from agent-runtime (`team/*` methods)
- `push:runtime-status-changed` — `AgentRuntimeStatus` transitions
- `push:runtime-crashed` — Unexpected process exit with code/signal

## Two External Communication Paths

1. **Agent Runtime** (JSON-RPC over stdio) — session/task control during active sessions
2. **Workspace Service** (HTTPS REST) — fetching conversation history when browsing past sessions (independent of agent-runtime)

## Agent-Runtime Lifecycle

- Binary located via `AGENT_RUNTIME_PATH` env var (dev) or bundled in `process.resourcesPath` (production)
- Spawned with `stdio: ['pipe', 'pipe', 'pipe']`, JSON-RPC client attached to stdout/stdin
- Crash detection: monitors child `exit` event, sets status to `crashed`, notifies renderer
- Graceful shutdown: `Shutdown` JSON-RPC → wait 10s → SIGTERM → wait 5s → SIGKILL

## Design Doc

Full specification: `cowork-infra/docs/components/desktop-app.md`

---

## Engineering Standards

### Project Structure

```
cowork-desktop-app/
  CLAUDE.md
  README.md
  Makefile
  package.json
  tsconfig.json              # Base config (references node + web)
  tsconfig.node.json         # Main process + shared
  tsconfig.web.json          # Renderer + shared + tests, JSX react-jsx
  electron.vite.config.ts    # Main + preload + renderer build targets
  electron-builder.yml
  eslint.config.mjs          # ESLint 9 flat config
  .prettierrc
  components.json            # shadcn/ui config
  .nvmrc                     # 22
  .env.example
  src/
    main/                    # Electron main process (Node.js)
      index.ts               # App entry point, window management
      preload.ts             # contextBridge typed API (security boundary)
      ipc-handlers.ts        # ipcMain.handle registrations
      agent-runtime.ts       # Agent-runtime process spawning/monitoring
      json-rpc-client.ts     # JSON-RPC 2.0 client over stdio
      workspace-client.ts    # Workspace Service HTTPS client (fetch + retry)
      settings-store.ts      # JSON file settings persistence
    renderer/                # Electron renderer process (React)
      index.html
      index.tsx
      index.css              # Tailwind CSS v4 entry
      App.tsx                # View router, event hooks, approval overlay
      preload.d.ts           # window.coworkIPC type declaration
      lib/utils.ts           # cn() utility (shadcn)
      state/                 # 6 Zustand stores
        session-store.ts     # Session, task state, runtime status, plan progress
        messages-store.ts    # Messages, streaming accumulation, tool cards
        approval-store.ts    # FIFO approval queue
        history-store.ts     # Workspaces, sessions, loading flags
        ui-store.ts          # Current view, theme, settings
        team-store.ts        # Team info, members, tasks, messages, teammate output
      hooks/                 # 12 custom React hooks
        use-session-events.ts       # Dispatches SessionEvent → stores
        use-team-events.ts          # Dispatches TeamEvent → team store
        use-agent-runtime-events.ts # Status changes + crash events
        use-create-session.ts       # IPC wrapper with loading/error
        use-start-task.ts
        use-cancel-task.ts
        use-approval.ts
        use-patch-preview.ts
        use-workspaces.ts
        use-sessions.ts
        use-session-history.ts
        use-settings.ts
      views/
        conversation/        # MessageList, MessageItem, MarkdownRenderer, ToolCallCard,
                             # PlanPanel, PromptInput, Header, Footer, ConversationView
        history/             # WorkspaceList/Item, SessionList/Item,
                             # HistoryHeader, HistoryView
        approval/            # ApprovalDialog, RiskLevelBadge
        patch/               # FileList, DiffViewer, PatchPreviewView
        team/                # TeamView, TeammatePanel, TaskBoardView, TeamMessageFeed
        settings/            # SettingsView
      components/
        ErrorBoundary.tsx
        ThemeProvider.tsx
        AppLayout.tsx
        StatusIndicator.tsx
        ui/                  # 17 shadcn/ui components
    shared/                  # Types shared between main and renderer
      types.ts               # Core types + re-exports from @cowork/platform
      ipc-channels.ts        # IPC_CHANNELS + IPC_EVENTS const objects
  tests/
    setup.ts                 # @testing-library/jest-dom/vitest
    unit/
      main/                  # json-rpc-client, agent-runtime, ipc-handlers, workspace-client, settings-store
      state/                 # session-store, messages-store, approval-store, history-store
      hooks/                 # use-create-session, use-settings, use-approval, use-cancel-task, use-patch-preview
      components/            # ErrorBoundary
      views/                 # PromptInput, ToolCallCard, ApprovalDialog, HistoryView, SettingsView
    e2e/
      conversation.test.ts   # Playwright test skeleton
      mock-agent-runtime.js  # Canned JSON-RPC responses for testing
  resources/
    icon.png
```

### TypeScript Tooling

- **Node**: 22 LTS (`.nvmrc`)
- **TypeScript**: 5.7+ with `strict: true`, `noUncheckedIndexedAccess: true`
- **Linting**: ESLint 9 flat config with `typescript-eslint/strictTypeChecked`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier`. shadcn/ui components in `components/ui/` are excluded from linting.
- **Formatting**: Prettier — single quotes, trailing commas, 100 print width, 2-space indent, `prettier-plugin-tailwindcss`
- **Markdown rendering**: `react-markdown` v9 + `remark-gfm` (GFM tables, strikethrough, task lists) + `rehype-highlight` (syntax-highlighted code blocks via highlight.js). Used in `MarkdownRenderer` component for assistant messages.
- **Testing**: Vitest + React Testing Library (unit), Playwright (E2E). 294 unit tests across 30 test files.
- **Build**: electron-vite for development (3 build targets: main, preload, renderer), electron-builder for distribution
- **UI**: shadcn/ui (Radix + Tailwind CSS v4) with 17 primitives. Tailwind v4 uses CSS-first config via `@tailwindcss/vite`.
- **State management**: Zustand v5 (lightweight, TypeScript-native)

### Makefile Targets

```
make help              # Show all targets
make install           # npm install
make lint              # ESLint
make format            # Prettier write
make format-check      # Prettier check
make typecheck         # tsc --noEmit (both node + web tsconfigs)
make test              # Vitest unit tests
make test-cov          # Unit tests with V8 coverage (80% threshold)
make test-e2e          # Playwright E2E tests
make dev               # Start in development mode (hot reload)
make build             # Build distributable (electron-vite build + electron-builder)
make check             # CI gate: lint + format-check + typecheck + test
make clean             # Remove out/, dist/, coverage/, node_modules/.cache
```

### Electron Security Patterns

**Main vs renderer process boundary is a security boundary:**
- **Main process** (`src/main/`): Node.js APIs, child process management, file system. NO React, NO DOM.
- **Renderer process** (`src/renderer/`): React, DOM, browser APIs. NO Node.js APIs, NO `require`. Window created with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- **Preload script** (`src/main/preload.ts`): The ONLY bridge. Uses `contextBridge.exposeInMainWorld('coworkIPC', {...})` with a fully typed `CoworkIPC` interface. Never exposes raw `ipcRenderer`.

### React Patterns

- **Zustand** for state management — one store per domain (session, messages, approval, history, ui, team). No Redux.
- **Error Boundaries** — `<ErrorBoundary>` wraps all views in `App.tsx` with a fallback UI.
- **Custom hooks** for IPC calls: `useCreateSession()`, `useStartTask()`, etc. Each returns `{ action, isLoading, error }` and handles `IpcResponse<T>` unwrapping.
- **Theme via CSS class** — `class="dark"` on `<html>`, works with shadcn/ui CSS variables. Supports light/dark/system (default: system).
- **Accessibility** — ARIA labels on interactive controls (PromptInput, Send/Cancel buttons, StatusIndicator), DiffViewer has `role="region"` with label.
- **No `any` types** — use `unknown` and narrow with type guards.

### Error Handling

- **IPC errors**: Every `ipcMain.handle` wraps results in `IpcResponse<T>`. JSON-RPC errors are translated via a `rpcError()` helper. Renderer never sees raw exceptions.
- **React Error Boundaries**: Catch rendering errors, show fallback UI with "Try Again" button.
- **Network errors**: Workspace Service calls wrapped with 3-retry exponential backoff (500ms base, jitter up to 50% of delay, no retry on 4xx based on `statusCode` property).
- **Agent-runtime crashes**: Detect child process exit, set status to `crashed`, notify renderer via `push:runtime-crashed` event.

### Testing

- **Unit tests (Vitest + React Testing Library)**: 294 tests across 30 files. Test stores, hooks (via `renderHook`), IPC handlers, main-process modules, and view components in isolation. Mock `window.coworkIPC` for renderer tests.
- **Coverage**: 80% threshold for statements, branches, functions, lines.
- **E2E tests (Playwright)**: Test skeleton with `mock-agent-runtime.js` providing canned JSON-RPC responses.
- **No snapshot tests** — assertion-based tests only.
