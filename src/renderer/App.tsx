import { ThemeProvider } from './components/ThemeProvider';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConversationView } from './views/conversation/ConversationView';
import { HistoryView } from './views/history/HistoryView';
import { PatchPreviewView } from './views/patch/PatchPreviewView';
import { SettingsView } from './views/settings/SettingsView';
import { ApprovalDialog } from './views/approval/ApprovalDialog';
import { useSessionEvents } from './hooks/use-session-events';
import { useAgentRuntimeEvents } from './hooks/use-agent-runtime-events';
import { useUIStore } from './state/ui-store';

export function App(): React.JSX.Element {
  const view = useUIStore((s) => s.view);
  const patchPreview = useUIStore((s) => s.patchPreview);

  // Register global event hooks
  useSessionEvents();
  useAgentRuntimeEvents();

  return (
    <ThemeProvider>
      <AppLayout>
        <ErrorBoundary>
          {view === 'history' && <HistoryView />}
          {view === 'conversation' && <ConversationView />}
          {view === 'patch' && <PatchPreviewView patch={patchPreview} />}
          {view === 'settings' && <SettingsView />}

          {/* Approval dialog renders on top of any view */}
          <ApprovalDialog />
        </ErrorBoundary>
      </AppLayout>
    </ThemeProvider>
  );
}
