import { ThemeProvider } from './components/ThemeProvider';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { ConversationView } from './views/conversation/ConversationView';
import { HomeView } from './views/home/HomeView';
import { PatchPreviewView } from './views/patch/PatchPreviewView';
import { SettingsView } from './views/settings/SettingsView';
import { ApprovalDialog } from './views/approval/ApprovalDialog';
import { useSessionEvents } from './hooks/use-session-events';
import { useTeamEvents } from './hooks/use-team-events';
import { useAgentRuntimeEvents } from './hooks/use-agent-runtime-events';
import { useUIStore } from './state/ui-store';

export function App(): React.JSX.Element {
  const view = useUIStore((s) => s.view);
  const patchPreview = useUIStore((s) => s.patchPreview);

  // Register global event hooks
  useSessionEvents();
  useTeamEvents();
  useAgentRuntimeEvents();

  return (
    <ThemeProvider>
      <AppLayout>
        <div className="flex h-full">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-hidden">
            <ErrorBoundary>
              {view === 'home' && <HomeView />}
              {view === 'conversation' && <ConversationView />}
              {view === 'patch' && <PatchPreviewView patch={patchPreview} />}
              {view === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </main>
        </div>

        {/* Approval dialog renders on top of any view */}
        <ApprovalDialog />
      </AppLayout>
    </ThemeProvider>
  );
}
