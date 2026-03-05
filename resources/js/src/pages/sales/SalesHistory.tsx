import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, ShoppingCart, Eye, FileText, Filter, Calendar, TrendingUp, Check } from 'lucide-react';
import { mockSales } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Sale } from '@/types';
import { ventaService } from '@/services/ventaService';

const SalesHistory = () => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const handleConfirmSale = async (saleId: number) => {
    try {
      await ventaService.confirmarVenta(saleId);

      // Actualizar estado local para evitar recargar todo
      setVentas(prev =>
        prev.map(v =>
          v.id === saleId ? { ...v, estado: "CONFIRMADA" } : v
        )
      );

    } catch (error) {
      console.error("Error al confirmar venta:", error);
    }
  };

  useEffect(() => {
    const fetchVentas = async () => {
      const ventas = await ventaService.getAll();
      setVentas(ventas);
    };
    fetchVentas();
  }, []);

  const filteredSales = ventas.filter((sale) => {
    const matchesSearch = sale.cliente?.razon_social
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.estado === statusFilter;
    const matchesPayment = paymentFilter === 'all' || sale.tipo_pago === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDIENTE: { variant: 'secondary', label: 'Pendiente' },
      CONFIRMADA: { variant: 'default', label: 'Confirmada' },
      ANULADA: { variant: 'destructive', label: 'Anulada' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (type: string) => {
    return (
      <Badge variant={type === 'CONTADO' ? 'outline' : 'secondary'}>
        {type === 'CONTADO' ? 'Contado' : 'Crédito'}
      </Badge>
    );
  };

  const totalSales = ventas.reduce((acc, sale) => acc + Number(sale.total_neto), 0);
  const creditSales = ventas.filter(s => s.tipo_pago === 'CREDITO').reduce((acc, s) => acc + Number(s.total_neto), 0);
  const cashSales = ventas.filter(s => s.tipo_pago === 'CONTADO').reduce((acc, s) => acc + Number(s.total_neto), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Historial de Ventas
          </h1>
          <p className="text-muted-foreground">
            Consulta y gestiona todas las ventas realizadas
          </p>
        </div>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold text-foreground">S/ {Number(totalSales).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas al Contado</p>
                <p className="text-2xl font-bold text-foreground">S/ {Number(cashSales).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas a Crédito</p>
                <p className="text-2xl font-bold text-foreground">S/ {Number(creditSales).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                <SelectItem value="ANULADA">Anulada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="CREDITO">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Ventas Realizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead>Tipo Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-muted/50">
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      #{sale.codigo?.padStart(6, '0')}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(sale.fecha, "dd MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.cliente?.razon_social}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{sale.items.length} items</Badge>
                  </TableCell>
                  <TableCell>{getPaymentBadge(sale.tipo_pago)}</TableCell>
                  <TableCell>{getStatusBadge(sale.estado)}</TableCell>
                  <TableCell className="text-right font-bold">
                    S/ {Number(sale.total_neto).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Detalle de Venta #{sale.codigo?.padStart(6, '0')}</DialogTitle>
                          <DialogDescription>
                            {sale.cliente?.razon_social} - {format(sale.fecha, "dd/MM/yyyy HH:mm")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="border rounded-lg divide-y">
                            {sale.items.map((item) => (
                              <div key={item.id} className="p-3 flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{item.producto?.nombre}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {Number(item.cantidad).toFixed(2)} x S/ {Number(item.precio_unitario).toFixed(2)}
                                  </p>
                                </div>
                                <p className="font-semibold">S/ {Number(item.subtotal).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2 pt-4 border-t">
                            {sale.descuento > 0 && (
                              <div className="flex justify-between text-red-500">
                                <span>Descuento</span>
                                <span>- S/ {Number(sale.descuento).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-lg font-bold">
                              <span>Total</span>
                              <span>S/ {Number(sale.total_neto).toFixed(2)}</span>
                            </div>

                            {sale.estado === "BORRADOR" && (
                              <Button
                                onClick={() => handleConfirmSale(sale.id)}
                                className="w-full mt-4"
                                size="sm"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirmar Venta
                              </Button>
                            )}

                            <div className="flex justify-between text-muted-foreground">
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesHistory;
