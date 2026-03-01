import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.JSX.Element {
  return <div className="flex h-screen flex-col overflow-hidden">{children}</div>;
}
