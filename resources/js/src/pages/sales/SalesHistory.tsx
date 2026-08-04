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
import { Search, ShoppingCart, Eye, FileText, Filter, Calendar, TrendingUp, Check, X, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Sale } from '@/types';
import { ventaService } from '@/services/ventaService';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

const SalesHistory = () => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al confirmar venta', error, 'No se pudo confirmar la venta.'));
    }
  };

  const handleCancelSale = async (saleId: number) => {
    try {
      await ventaService.anularVenta(saleId);

      setVentas(prev =>
        prev.map(v =>
          v.id === saleId ? { ...v, estado: "ANULADA" } : v
        )
      );

    } catch (error) {
      console.error("ERROR COMPLETO:", error);
      console.error("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al anular venta', error, 'No se pudo anular la venta.'));
    }
  };

  const handleDeleteSale = async (saleId: number) => {
    try {
      await ventaService.delete(saleId);

      setVentas(prev =>
        prev.filter(v => v.id !== saleId)
      );

    } catch (error) {
      console.error("ERROR COMPLETO:", error);
      console.error("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al eliminar venta', error, 'No se pudo eliminar la venta.'));
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
    
    let matchesDate = true;
    if (startDate || endDate) {
      try {
        const saleDate = new Date(sale.fecha);
        const saleDateStr = format(saleDate, 'yyyy-MM-dd');
        if (startDate && saleDateStr < startDate) {
          matchesDate = false;
        }
        if (endDate && saleDateStr > endDate) {
          matchesDate = false;
        }
      } catch (error) {
        console.error("Error matching date for sale:", sale, error);
      }
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const paginatedSales = filteredSales.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

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

  const confirmedSales = filteredSales.filter(v => v.estado === 'CONFIRMADA');

  const totalSales = confirmedSales.reduce(
    (acc, sale) => acc + Number(sale.total_neto || 0),
    0
  );

  const creditSales = confirmedSales
    .filter(s => s.tipo_pago === 'CREDITO')
    .reduce((acc, s) => acc + Number(s.total_neto || 0), 0);

  const cashSales = confirmedSales
    .filter(s => s.tipo_pago === 'CONTADO')
    .reduce((acc, s) => acc + Number(s.total_neto || 0), 0);

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
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
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
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  placeholder="Desde"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-36 text-xs sm:text-sm"
                />
                <span className="text-muted-foreground text-xs sm:text-sm">a</span>
                <Input
                  type="date"
                  placeholder="Hasta"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-36 text-xs sm:text-sm"
                />
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="h-9 px-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
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
                <TableHead>Nota Pedido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSales.map((sale) => (
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
                  <TableCell>
                    {sale.nota_pedido ? (
                      <span className="font-mono text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded border border-amber-200/50 dark:border-amber-800/30">
                        {sale.nota_pedido}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
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
                          <div className="grid grid-cols-2 gap-4 pb-4 border-b text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Tipo de Pago</p>
                              <p className="font-semibold">{sale.tipo_pago === 'CONTADO' ? 'Contado' : 'Crédito'}</p>
                            </div>
                            {sale.tipo_pago === 'CREDITO' && (
                              <div>
                                <p className="text-xs text-muted-foreground">Nota de Pedido</p>
                                <p className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                  {sale.nota_pedido || '-'}
                                </p>
                              </div>
                            )}
                          </div>
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
                                className="w-full mt-4 bg-green-500 hover:bg-green-600"
                                size="sm"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirmar Venta
                              </Button>
                            )}

                            {(sale.estado === "BORRADOR") && (
                              <Button
                                onClick={() => handleDeleteSale(sale.id)}
                                className="w-full mt-4 bg-red-500 hover:bg-red-600"
                                size="sm"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Eliminar Venta
                              </Button>
                            )}

                            {sale.estado === "CONFIRMADA" && (
                              <Button
                                onClick={() => handleCancelSale(sale.id)}
                                className="w-full mt-4 bg-red-500 hover:bg-red-600"
                                size="sm"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Anular Venta
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
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>

              <span className="px-3 py-2 text-sm">
                Página {page} de {totalPages}
              </span>

              <Button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesHistory;
