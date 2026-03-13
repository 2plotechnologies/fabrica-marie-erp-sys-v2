import { Sale } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RecentSalesTableProps {
  sales: any[];
}

export const RecentSalesTable = ({ sales }: RecentSalesTableProps) => {
  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="p-5 border-b">
        <h3 className="font-display text-lg font-semibold">Ventas Recientes</h3>
        <p className="text-sm text-muted-foreground">Últimas transacciones del día</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale, index) => (
              <TableRow
                key={sale.id}
                className="animate-fade-in"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{sale.cliente}</p>
                    <p className="text-xs text-muted-foreground">{sale.estado}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {sale.items.length} producto{sale.items.length > 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">
                    S/ {Number(sale.total_neto).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={sale.tipo_pago === '1' ? 'default' : 'secondary'}>
                    {sale.tipo_pago}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      sale.estado === 'CONFIRMADA' && 'border-success text-success',
                      sale.estado === 'PENDIENTE' && 'border-warning text-warning',
                      sale.estado === 'ANULADA' && 'border-destructive text-destructive'
                    )}
                  >
                    {sale.estado}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
