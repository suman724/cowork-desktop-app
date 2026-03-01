import { ScrollArea } from '../../components/ui/scroll-area';

interface DiffViewerProps {
  hunks: string;
  filePath: string;
}

export function DiffViewer({ hunks, filePath }: DiffViewerProps): React.JSX.Element {
  const lines = hunks.split('\n');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2 text-sm font-medium">{filePath}</div>
      <ScrollArea className="flex-1">
        <pre className="p-4 text-xs">
          {lines.map((line, i) => {
            let className = '';
            if (line.startsWith('+'))
              className = 'bg-green-500/10 text-green-700 dark:text-green-400';
            else if (line.startsWith('-'))
              className = 'bg-red-500/10 text-red-700 dark:text-red-400';
            else if (line.startsWith('@@')) className = 'text-blue-500';

            return (
              <div key={i} className={className}>
                <span className="text-muted-foreground mr-2 inline-block w-8 text-right select-none">
                  {i + 1}
                </span>
                {line}
              </div>
            );
          })}
        </pre>
      </ScrollArea>
    </div>
  );
}
