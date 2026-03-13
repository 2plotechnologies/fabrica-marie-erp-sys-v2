import { Stock } from '@/types';
import { AlertTriangle, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StockAlertsProps {
  lowStockItems: any[];
}

export const StockAlerts = ({ lowStockItems }: StockAlertsProps) => {
  return (
    <div className="bg-card rounded-xl border shadow-card animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="p-5 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Alertas de Stock</h3>
            <p className="text-sm text-muted-foreground">
              {lowStockItems.length} producto{lowStockItems.length !== 1 ? 's' : ''} bajo mínimo
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {lowStockItems.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay alertas de stock</p>
          </div>
        ) : (
          lowStockItems.map((item, index) => {
            const percentage = (Number(item.cantidad) / Number(item.stock_minimo)) * 100;
            const isCritical = percentage < 50;

            return (
              <div
                key={item.id}
                className="space-y-2 animate-fade-in"
                style={{ animationDelay: `${500 + index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-semibold",
                      isCritical ? 'text-destructive' : 'text-warning'
                    )}>
                      {item.cantidad} unidades
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mínimo: {item.stock_minimo}
                    </p>
                  </div>
                </div>
                <Progress
                  value={Math.min(percentage, 100)}
                  className={cn(
                    "h-2",
                    isCritical ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'
                  )}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
