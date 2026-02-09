import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
};

const iconBgStyles = {
  default: 'bg-muted',
  primary: 'bg-primary/20',
  success: 'bg-green-500/20',
  warning: 'bg-yellow-500/20',
  danger: 'bg-red-500/20',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={cn("text-3xl font-bold", variantStyles[variant])}>{value}</p>
          {trend && (
            <p className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-green-400" : "text-red-400"
            )}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconBgStyles[variant])}>
          <Icon className={cn("w-6 h-6", variantStyles[variant])} />
        </div>
      </div>
    </motion.div>
  );
}
