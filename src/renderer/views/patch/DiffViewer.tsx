import { useMemo } from 'react';
import { ScrollArea } from '../../components/ui/scroll-area';

interface DiffViewerProps {
  hunks: string;
  filePath: string;
}

interface DiffLine {
  content: string;
  type: 'add' | 'remove' | 'context' | 'hunk-header';
  lineNumber: string;
}

/**
 * Parse unified diff hunks into lines with actual source line numbers.
 * Hunk headers look like: @@ -oldStart,oldCount +newStart,newCount @@
 */
function parseDiffLines(hunks: string): DiffLine[] {
  const rawLines = hunks.split('\n');
  const result: DiffLine[] = [];
  let newLine = 0;

  for (const line of rawLines) {
    if (line.startsWith('@@')) {
      // Parse hunk header to extract new-file start line
      const match = /\+(\d+)/.exec(line);
      newLine = match?.[1] !== undefined ? parseInt(match[1], 10) : 1;
      result.push({ content: line, type: 'hunk-header', lineNumber: '...' });
    } else if (line.startsWith('+')) {
      result.push({ content: line, type: 'add', lineNumber: String(newLine) });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({ content: line, type: 'remove', lineNumber: '' });
    } else {
      result.push({ content: line, type: 'context', lineNumber: String(newLine) });
      newLine++;
    }
  }

  return result;
}

const LINE_STYLES: Record<DiffLine['type'], string> = {
  add: 'bg-green-500/10 text-green-700 dark:text-green-400',
  remove: 'bg-red-500/10 text-red-700 dark:text-red-400',
  'hunk-header': 'text-blue-500',
  context: '',
};

export function DiffViewer({ hunks, filePath }: DiffViewerProps): React.JSX.Element {
  const lines = useMemo(() => parseDiffLines(hunks), [hunks]);

  return (
    <div className="flex h-full flex-col" role="region" aria-label={`Diff for ${filePath}`}>
      <div className="border-b px-4 py-2 text-sm font-medium">{filePath}</div>
      <ScrollArea className="flex-1">
        <pre className="p-4 text-xs">
          {lines.map((line, i) => (
            <div key={i} className={LINE_STYLES[line.type]}>
              <span className="text-muted-foreground mr-2 inline-block w-8 text-right select-none">
                {line.lineNumber}
              </span>
              {line.content}
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
}
