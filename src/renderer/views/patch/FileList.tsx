import { cn } from '../../lib/utils';
import type { FileDiff } from '../../../shared/types';

interface FileListProps {
  files: FileDiff[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const STATUS_ICON: Record<FileDiff['status'], string> = {
  added: '+',
  modified: '~',
  deleted: '-',
};

const STATUS_COLOR: Record<FileDiff['status'], string> = {
  added: 'text-green-500',
  modified: 'text-amber-500',
  deleted: 'text-red-500',
};

export function FileList({ files, selectedIndex, onSelect }: FileListProps): React.JSX.Element {
  return (
    <div className="space-y-0.5 p-2">
      {files.map((file, index) => (
        <button
          key={file.filePath}
          onClick={() => onSelect(index)}
          className={cn(
            'hover:bg-accent w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
            index === selectedIndex && 'bg-accent',
          )}
        >
          <span className={cn('mr-2 font-mono', STATUS_COLOR[file.status])}>
            {STATUS_ICON[file.status]}
          </span>
          <span className="truncate">{file.filePath}</span>
        </button>
      ))}
    </div>
  );
}
