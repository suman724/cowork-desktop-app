import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

interface RiskLevelBadgeProps {
  riskLevel: string;
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function RiskLevelBadge({ riskLevel }: RiskLevelBadgeProps): React.JSX.Element {
  const colorClass = RISK_COLORS[riskLevel] ?? RISK_COLORS['medium'];
  return (
    <Badge variant="outline" className={cn(colorClass)}>
      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
    </Badge>
  );
}
