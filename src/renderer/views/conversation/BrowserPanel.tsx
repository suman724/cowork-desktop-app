/**
 * BrowserPanel — collapsible side panel showing browser state.
 *
 * Displays current URL, screenshot stream, and action buttons
 * (Takeover, Pause/Resume, Close). Opens automatically when
 * the browser starts, closeable by the user.
 */
import { Globe, Play, Pause, X, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useBrowserStore } from '../../state/browser-store';

export function BrowserPanel(): React.JSX.Element | null {
  const panelOpen = useBrowserStore((s) => s.panelOpen);
  const browserStatus = useBrowserStore((s) => s.browserStatus);
  const currentUrl = useBrowserStore((s) => s.currentUrl);
  const currentScreenshot = useBrowserStore((s) => s.currentScreenshot);
  const setPanelOpen = useBrowserStore((s) => s.setPanelOpen);
  const setBrowserStatus = useBrowserStore((s) => s.setBrowserStatus);

  if (!panelOpen) return null;

  const isActive = browserStatus === 'active' || browserStatus === 'takeover';

  const handleTakeover = async (): Promise<void> => {
    const result = await window.coworkIPC.browserTakeover();
    if (result.success) {
      setBrowserStatus('takeover');
    }
  };

  const handlePauseResume = async (): Promise<void> => {
    if (browserStatus === 'takeover') {
      const result = await window.coworkIPC.browserResume();
      if (result.success) {
        setBrowserStatus('active');
      }
    } else {
      const result = await window.coworkIPC.browserPause();
      if (result.success) {
        setBrowserStatus('takeover');
      }
    }
  };

  const handleClose = (): void => {
    setPanelOpen(false);
  };

  return (
    <div className="bg-card flex w-80 flex-col border-l" data-testid="browser-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Globe className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">Browser</span>
          {browserStatus === 'takeover' && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Takeover
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleClose}
          aria-label="Close browser panel"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* URL bar */}
      {currentUrl && (
        <div className="border-b px-3 py-2">
          <div className="bg-muted text-muted-foreground flex items-center gap-1 rounded px-2 py-1 text-xs">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{currentUrl}</span>
          </div>
        </div>
      )}

      {/* Screenshot */}
      <div className="flex-1 overflow-auto p-2">
        {currentScreenshot ? (
          <img
            src={`data:image/png;base64,${currentScreenshot}`}
            alt="Browser screenshot"
            className="w-full rounded border"
          />
        ) : (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            {isActive ? 'Waiting for page load...' : 'Browser not active'}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isActive && (
        <div className="flex gap-2 border-t px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => void handleTakeover()}
            disabled={browserStatus === 'takeover'}
            aria-label="Take over browser"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Takeover
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => void handlePauseResume()}
            aria-label={browserStatus === 'takeover' ? 'Resume agent' : 'Pause agent'}
          >
            {browserStatus === 'takeover' ? (
              <>
                <Play className="mr-1 h-3 w-3" />
                Resume
              </>
            ) : (
              <>
                <Pause className="mr-1 h-3 w-3" />
                Pause
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
