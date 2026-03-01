# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

`cowork-desktop-app` is the Electron/React desktop application for Windows and macOS. It provides the conversation UI, renders approval dialogs, previews file changes, and manages the `cowork-agent-runtime` lifecycle. It contains **no business logic** — everything is delegated to the agent-runtime via JSON-RPC.

## Architecture

```
app/
  shell/          — Application window, menu bar, tray icon, lifecycle
  views/
    conversation/ — Active conversation (message list, prompt input, streaming responses)
    history/      — Past sessions browser (workspace list, session list)
    approval/     — Local Approval UI (modal dialogs for risky actions)
    patch/        — Patch preview (unified/side-by-side diff viewer)
    settings/     — User preferences, connection settings
  ipc/            — JSON-RPC client, request/response handling, event listener
  state/          — Centralized application state (current session, messages, UI state)
  workspace/      — Workspace Service HTTPS client (fetch history, list sessions)
updater/
  manifest/       — Version manifest fetching and parsing
  download/       — Agent-runtime download, integrity verification (Phase 4)
  launch/         — Process spawning, health monitoring, restart logic
```

## Key Constraints

- **No direct imports from `cowork-agent-runtime`** — all communication is JSON-RPC 2.0 over stdio/local socket.
- **Depends only on `cowork-platform`** (npm package) for JSON-RPC types, error codes, event types.
- Only `ipc/` communicates with the Local Agent Host — views never send JSON-RPC directly.
- Only `workspace/` communicates with the Workspace Service — views call workspace methods.
- All views read/write through `state/` for consistent UI state.

## IPC Methods

Requests (Desktop App → Agent Host): `CreateSession`, `StartTask`, `CancelTask`, `ResumeSession`, `GetSessionState`, `GetPatchPreview`, `ApproveAction`, `Shutdown`

Notifications (Agent Host → Desktop App): `SessionEvent` with event types: `text_chunk`, `step_started`, `step_completed`, `tool_requested`, `tool_completed`, `approval_requested`, `approval_resolved`, `step_limit_approaching`, `policy_expired`

## Two External Communication Paths

1. **Local Agent Host** (JSON-RPC) — session/task control during active sessions
2. **Workspace Service** (HTTPS REST) — fetching conversation history when browsing past sessions (independent of agent-runtime)

## Agent-Runtime Lifecycle

- **Phase 1:** Bundled inside the Electron installer with embedded Python runtime. Updater locates and spawns it.
- **Phase 4:** Independent download — version manifest check, platform-specific bundle download, SHA-256 + code signing verification.
- Graceful shutdown: `Shutdown` JSON-RPC → wait 10s → SIGTERM → wait 5s → SIGKILL.

## Credential Management

- Stored in OS keychain (macOS Keychain / Windows Credential Manager) — never plaintext on disk.
- IPC channel has no authentication — it's a local child process, single client.

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
  tsconfig.json
  electron-builder.yml
  eslint.config.mjs
  .prettierrc
  .nvmrc                      # 22
  .env.example
  src/
    main/                     # Electron main process (Node.js)
      index.ts                # App entry point, window management
      preload.ts              # contextBridge typed API (security boundary)
      ipc-handlers.ts         # ipcMain.handle registrations
      agent-runtime.ts        # Agent-runtime process spawning/monitoring
    renderer/                 # Electron renderer process (React)
      index.html
      index.tsx
      App.tsx
      views/
        conversation/         # Active conversation view
        history/              # Past sessions browser
        approval/             # Approval modal dialogs
        patch/                # Diff viewer
        settings/             # Preferences
      components/             # Shared UI components
        ErrorBoundary.tsx
      hooks/                  # Custom React hooks for IPC calls
      state/                  # Zustand stores
      workspace/              # Workspace Service HTTPS client
    shared/                   # Types shared between main and renderer
      ipc-channels.ts         # Typed IPC channel definitions
      types.ts                # Shared type definitions
  tests/
    unit/                     # Vitest + React Testing Library
    e2e/                      # Playwright E2E tests
    setup.ts                  # Test environment setup
  resources/                  # App icons, assets
```

### TypeScript Tooling

- **Node**: 22 LTS (`.nvmrc`)
- **TypeScript**: 5.7+ with `strict: true`, `noUncheckedIndexedAccess: true`
- **Linting**: ESLint 9 flat config with `typescript-eslint/strictTypeChecked`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier`
- **Formatting**: Prettier — single quotes, trailing commas, 100 print width, 2-space indent
- **Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
- **Build**: electron-vite for development, electron-builder for distribution
- **State management**: Zustand (lightweight, TypeScript-native)

### Makefile Targets

```
make help              # Show all targets
make install           # npm ci
make lint              # ESLint
make format            # Prettier write
make format-check      # Prettier check
make typecheck         # tsc --noEmit
make test              # Vitest unit tests
make test-cov          # Unit tests with V8 coverage (80% threshold)
make test-e2e          # Playwright E2E tests
make dev               # Start in development mode (hot reload)
make build             # Build distributable (electron-builder)
make check             # CI gate: lint + format-check + typecheck + test
make clean             # Remove dist/, out/, coverage/
```

### Electron Security Patterns

**Main vs renderer process boundary is a security boundary:**
- **Main process** (`src/main/`): Node.js APIs, file system, child process management, OS keychain. NO React, NO DOM.
- **Renderer process** (`src/renderer/`): React, DOM, browser APIs. NO Node.js APIs, NO `require('fs')`, NO `require('child_process')`.
- **Preload script** (`src/main/preload.ts`): The ONLY bridge. Use `contextBridge.exposeInMainWorld()` with a typed API. Never expose raw `ipcRenderer`.

```typescript
// src/main/preload.ts — typed API surface
contextBridge.exposeInMainWorld('coworkIPC', {
  createSession: (params) => ipcRenderer.invoke('session:create', params),
  startTask: (params) => ipcRenderer.invoke('task:start', params),
  onSessionEvent: (cb) => ipcRenderer.on('session:event', (_e, evt) => cb(evt)),
  // ... all IPC channels typed in src/shared/ipc-channels.ts
});
```

### React Patterns

- **Zustand** for state management — one store per domain (session store, history store, UI store). No Redux.
- **Error Boundaries** on every view — wrap each view in `<ErrorBoundary>` with a fallback UI.
- **React.Suspense** with fallback for lazy-loaded views.
- **Custom hooks** for IPC calls: `useCreateSession()`, `useStartTask()`, etc. Hooks handle loading, error, and success states.
- **No `any` types** — use `unknown` and narrow with type guards.

### Error Handling

- **IPC errors**: Parse JSON-RPC error responses into typed error objects. Map error codes to user-facing messages (see architecture CLAUDE.md for the mapping table).
- **React Error Boundaries**: Catch rendering errors, show fallback UI, log to telemetry.
- **Network errors**: Workspace Service calls wrapped with retry (3 attempts, exponential backoff).
- **Agent-runtime crashes**: Detect child process exit, show recovery dialog (resume / start fresh / close).

### Testing

- **Unit tests (Vitest + React Testing Library)**: Test components in isolation, mock IPC calls, test state stores.
- **Coverage**: 80% threshold for statements, branches, functions, lines.
- **E2E tests (Playwright)**: Launch Electron app, test critical flows (start session, send prompt, approve action, view history).
- **IPC tests**: Mock the main process, test that renderer sends correct messages and handles responses.
- **No snapshot tests** — they create noise and break on cosmetic changes. Prefer assertion-based tests.
