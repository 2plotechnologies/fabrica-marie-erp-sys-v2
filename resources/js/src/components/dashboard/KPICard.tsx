import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
    showPlus?: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  delay?: number;
}

const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-gradient-warm border-primary/20',
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  danger: 'bg-destructive/10 border-destructive/20',
};

const iconStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary-foreground/20 text-primary-foreground',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-destructive/20 text-destructive',
};

const textStyles = {
  default: 'text-foreground',
  primary: 'text-primary-foreground',
  success: 'text-foreground',
  warning: 'text-foreground',
  danger: 'text-foreground',
};

export const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  delay = 0,
}: KPICardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-slide-up overflow-hidden",
        variantStyles[variant],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative element */}
      {variant === 'primary' && (
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
      )}
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            variant === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            "text-2xl lg:text-3xl font-display font-bold tracking-tight",
            textStyles[variant]
          )}>
            {typeof value === 'number' ? value.toLocaleString('es-PE') : value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-xs",
              variant === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={cn(
                "font-medium",
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {(trend.showPlus ?? true) && trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className={cn(
                variant === 'primary' ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}>
                {trend.label || 'vs ayer'}
              </span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center",
          iconStyles[variant]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};
