import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'open' | 'closed' | 'pending' | 'critical' | 'success' | 'warning';
}

const variantClasses = {
  default: 'bg-muted text-muted-foreground border-border',
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variantClasses[variant]
    )}>
      {children}
    </span>
  );
}

export function getStatusVariant(status: string): BadgeProps['variant'] {
  const statusMap: Record<string, BadgeProps['variant']> = {
    open: 'open',
    closed: 'closed',
    pending: 'pending',
    under_investigation: 'warning',
    critical: 'critical',
    high: 'critical',
    medium: 'warning',
    low: 'success',
    completed: 'success',
    in_progress: 'pending',
    inconclusive: 'warning',
    arrested: 'critical',
    cleared: 'success',
    suspect: 'warning',
    person_of_interest: 'pending',
    in_storage: 'default',
    in_lab: 'pending',
    released: 'success',
    disposed: 'closed',
  };
  return statusMap[status] || 'default';
}
