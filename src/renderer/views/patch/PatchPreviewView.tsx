import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { FileList } from './FileList';
import { DiffViewer } from './DiffViewer';
import { useUIStore } from '../../state/ui-store';
import type { PatchPreview } from '../../../shared/types';

interface PatchPreviewViewProps {
  patch: PatchPreview | null;
}

export function PatchPreviewView({ patch }: PatchPreviewViewProps): React.JSX.Element {
  const setView = useUIStore((s) => s.setView);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!patch || patch.files.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h1 className="text-sm font-semibold">Patch Preview</h1>
          <Button variant="ghost" size="sm" onClick={() => setView('conversation')}>
            Back
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">No changes to preview</p>
        </div>
      </div>
    );
  }

  const selectedFile = patch.files[selectedIndex];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">
          Patch Preview &middot; {patch.files.length} file{patch.files.length > 1 ? 's' : ''}
        </h1>
        <Button variant="ghost" size="sm" onClick={() => setView('conversation')}>
          Back
        </Button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r">
          <FileList files={patch.files} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1">
          {selectedFile && (
            <DiffViewer hunks={selectedFile.hunks} filePath={selectedFile.filePath} />
          )}
        </div>
      </div>
    </div>
  );
}
