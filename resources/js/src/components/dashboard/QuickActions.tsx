import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  UserPlus,
  Package,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const actions = [
  {
    label: 'Nueva Venta',
    description: 'Registrar venta en ruta',
    icon: ShoppingCart,
    to: '/ventas/nueva',
    variant: 'primary' as const,
  },
  {
    label: 'Nuevo Cliente',
    description: 'Agregar nuevo cliente',
    icon: UserPlus,
    to: '/clientes/nuevo',
    variant: 'default' as const,
  },
  {
    label: 'Registrar Entrada',
    description: 'Ingreso de productos',
    icon: Package,
    to: '/almacen/movimientos',
    variant: 'default' as const,
  },
  {
    label: 'Cobrar Deuda',
    description: 'Registrar abono',
    icon: CreditCard,
    to: '/clientes/cobrar',
    variant: 'default' as const,
  },
];

export const QuickActions = () => {
  return (
    <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
      <h3 className="font-display text-lg font-semibold mb-4">Acciones Rápidas</h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link
            key={action.to}
            to={action.to}
            className={cn(
              "group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 animate-scale-in overflow-hidden",
              action.variant === 'primary'
                ? 'bg-gradient-warm border-primary/20 text-primary-foreground'
                : 'bg-secondary/50 border-transparent hover:border-border'
            )}
            style={{ animationDelay: `${300 + index * 50}ms` }}
          >
            {action.variant === 'primary' && (
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary-foreground/10 blur-xl" />
            )}

            <div className={cn(
              "relative h-10 w-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
              action.variant === 'primary'
                ? 'bg-primary-foreground/20'
                : 'bg-primary/10'
            )}>
              <action.icon className={cn(
                "h-5 w-5",
                action.variant === 'primary' ? 'text-primary-foreground' : 'text-primary'
              )} />
            </div>

            <span className={cn(
              "relative text-sm font-medium text-center",
              action.variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
            )}>
              {action.label}
            </span>

            <span className={cn(
              "relative text-xs text-center mt-0.5",
              action.variant === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {action.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
