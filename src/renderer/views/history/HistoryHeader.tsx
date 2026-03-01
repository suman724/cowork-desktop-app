import { Button } from '../../components/ui/button';
import { useUIStore } from '../../state/ui-store';

interface HistoryHeaderProps {
  onNewChat: () => void;
}

export function HistoryHeader({ onNewChat }: HistoryHeaderProps): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      <h1 className="text-sm font-semibold">History</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onNewChat}>
          New Chat
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setView('settings')}>
          Settings
        </Button>
      </div>
    </div>
  );
}
