import { Client } from '@/types';
import { Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientsOverviewProps {
  clients: any[];
}

export const ClientsOverview = ({ clients }: ClientsOverviewProps) => {
  const activeClients = clients.filter(c => c.status === 'ACTIVO').length;
  const delinquentClients = clients.filter(c => c.status === 'MOROSO').length;
  const totalDebt = clients.reduce((sum, c) => sum + Number(c.deuda_actual), 0);

  const stats = [
    {
      label: 'Clientes Activos',
      value: activeClients,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Clientes Morosos',
      value: delinquentClients,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Deuda Total',
      value: `S/ ${totalDebt.toLocaleString('es-PE')}`,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="bg-card rounded-xl border shadow-card animate-slide-up" style={{ animationDelay: '500ms' }}>
      <div className="p-5 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Resumen de Clientes</h3>
            <p className="text-sm text-muted-foreground">{clients.length} clientes registrados</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="flex items-center justify-between animate-fade-in"
            style={{ animationDelay: `${600 + index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <span className="font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Recent delinquent clients */}
      {delinquentClients > 0 && (
        <div className="px-5 pb-5">
          <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/10">
            <p className="text-xs font-medium text-destructive mb-2">Clientes con deuda vencida:</p>
            <div className="space-y-1">
              {clients
                .filter(c => c.estado === 'MOROSO')
                .slice(0, 3)
                .map(client => (
                  <div key={client.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{client.razon_social}</span>
                    <span className="font-medium text-destructive">
                      S/ {Number(client.deuda_actual).toLocaleString('es-PE')}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
