# cowork-desktop-app

Electron + React desktop application for the Cowork agent system. Provides the conversation UI, approval dialogs, patch preview, and session history browser. Contains **no business logic** — all agent execution is delegated to `cowork-agent-runtime` via JSON-RPC 2.0 over stdio.

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Electron | ^35 | Desktop shell |
| React | ^19 | UI framework |
| TypeScript | ^5.7 | `strict: true`, `noUncheckedIndexedAccess: true` |
| electron-vite | ^3 | Dev server + build (Vite-based, 3 build targets) |
| electron-builder | ^26 | Distribution packaging (macOS, Windows, Linux) |
| shadcn/ui | latest | Component library (Radix + Tailwind CSS v4) |
| Tailwind CSS | ^4 | Styling (CSS-first config via `@tailwindcss/vite`) |
| Zustand | ^5 | State management (5 stores) |
| Vitest + RTL | ^2 | Unit tests (85 tests across 14 files) |
| Playwright | ^1.50 | E2E tests |
| ESLint 9 | flat config | Linting (`typescript-eslint/strictTypeChecked`) |
| Prettier | ^3 | Formatting (single quotes, trailing commas, 100 width) |
| Node | 22 LTS | Runtime |

## Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **npm** (ships with Node)
- **`cowork-platform`** — must be cloned as a sibling directory (`../cowork-platform`) for the local `file:` dependency

## Getting Started

```bash
# Install dependencies
make install

# Start in development mode with hot reload
make dev

# Run all CI checks (lint + format + typecheck + tests)
make check
```

To point at a local agent-runtime binary during development:

```bash
AGENT_RUNTIME_PATH=/path/to/agent-runtime make dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_SERVICE_URL` | `http://localhost:8003` | Workspace Service URL for history browsing |
| `TENANT_ID` | `dev-tenant` | Default tenant ID for local development |
| `USER_ID` | `dev-user` | Default user ID for local development |
| `AGENT_RUNTIME_PATH` | (auto-detected) | Override path to agent-runtime binary |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Electron Main Process                     │
│                                                              │
│  AgentRuntimeManager ──── JsonRpcClient ──── agent-runtime   │
│  WorkspaceServiceClient ──── fetch ──── Workspace Service    │
│  SettingsStore ──── JSON file (userData)                      │
│  IPC Handlers ──── ipcMain.handle (IpcResponse<T>)           │
│                                                              │
│  ▼ contextBridge (preload.ts)                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │               Electron Renderer Process                 │  │
│  │                                                        │  │
│  │  window.coworkIPC  →  Zustand Stores  →  React Views   │  │
│  │                                                        │  │
│  │  Stores: session, messages, approval, history, ui      │  │
│  │  Views: conversation, history, approval, patch,        │  │
│  │         settings                                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Security boundary**: The renderer process runs sandboxed (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`). All communication with Node.js APIs goes through the typed `CoworkIPC` preload bridge. Raw `ipcRenderer` is never exposed.

**IPC contract**: Every `ipcMain.handle` returns `IpcResponse<T>` — either `{ success: true, data }` or `{ success: false, error }`. The renderer never sees raw exceptions from the main process.

## Project Structure

```
src/
  main/                     # Electron main process (Node.js)
    index.ts                # App entry, window creation, lifecycle
    preload.ts              # contextBridge typed API (security boundary)
    ipc-handlers.ts         # ipcMain.handle for all IPC channels
    agent-runtime.ts        # Agent-runtime spawn/monitor/shutdown
    json-rpc-client.ts      # JSON-RPC 2.0 over stdio
    workspace-client.ts     # Workspace Service HTTPS client
    settings-store.ts       # JSON file persistence
  renderer/                 # Electron renderer process (React 19)
    App.tsx                 # View router, event hooks, approval overlay
    state/                  # 5 Zustand stores
    hooks/                  # 11 custom hooks (events + IPC wrappers)
    views/                  # 5 view groups (19 components)
    components/             # Shared components + 17 shadcn/ui primitives
  shared/                   # Types shared between main and renderer
    types.ts                # Core types + @cowork/platform re-exports
    ipc-channels.ts         # IPC_CHANNELS (13) + IPC_EVENTS (3)
tests/
  unit/                     # Vitest + React Testing Library
  e2e/                      # Playwright + mock-agent-runtime
```

## Available Commands

```
make help              # Show all targets
make install           # Install dependencies
make dev               # Development mode with hot reload
make build             # Build distributable (electron-vite + electron-builder)
make lint              # ESLint
make format            # Auto-format with Prettier
make format-check      # Check formatting
make typecheck         # TypeScript type checking (node + web tsconfigs)
make test              # Run unit tests
make test-cov          # Unit tests with V8 coverage (80% threshold)
make test-e2e          # Playwright E2E tests
make check             # CI gate: lint + format-check + typecheck + test
make clean             # Remove build artifacts
```

## Communication Paths

The app has two external communication paths:

1. **Agent Runtime** (JSON-RPC 2.0 over stdio) — active session/task control
   - Methods: `CreateSession`, `StartTask`, `CancelTask`, `GetSessionState`, `ApproveAction`, `GetPatchPreview`, `Shutdown`
   - Notifications: `SessionEvent` with event types (`text_chunk`, `tool_requested`, `tool_completed`, `approval_requested`, `step_completed`, etc.)

2. **Workspace Service** (HTTPS REST) — historical data browsing, independent of agent-runtime
   - Endpoints: list workspaces, list sessions, get session history

## Agent-Runtime Lifecycle

1. Binary located via `AGENT_RUNTIME_PATH` env var (dev) or bundled in `process.resourcesPath` (production)
2. Spawned with `child_process.spawn`, JSON-RPC client attached to stdio pipes
3. Crash detection: monitors child `exit` event, notifies renderer
4. Graceful shutdown sequence: `Shutdown` RPC → 10s wait → SIGTERM → 5s wait → SIGKILL

## Dependencies

| Dependency | Purpose |
|-----------|---------|
| `@cowork/platform` | Shared types (`Session`, `PolicyBundle`, `ApprovalRequest`, `Workspace`, `ConversationMessage`) |
| `react`, `react-dom` | UI framework |
| `zustand` | State management |
| `@radix-ui/*` | Accessible UI primitives (via shadcn/ui) |
| `tailwindcss`, `@tailwindcss/vite` | CSS framework |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Styling utilities |
| `lucide-react` | Icons |

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on all branches:
1. Lint (ESLint)
2. Format check (Prettier)
3. Type check (TypeScript)
4. Unit tests (Vitest)
