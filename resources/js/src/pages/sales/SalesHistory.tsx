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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, ShoppingCart, Eye, FileText, Filter, Calendar, TrendingUp, Check, X, Trash, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Sale } from '@/types';
import { ventaService } from '@/services/ventaService';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

interface CanjeItemState {
  item_id: number;
  producto_id: number;
  producto_nombre: string;
  tipo_item: 'VENTA' | 'BONIFICACIÓN' | 'DEGUSTACIÓN';
  cantidad_original: number;
  cantidad_canje: number;
  stock_disponible: number;
  max_posible: number;
  motivo: string;
}

const SalesHistory = () => {
  const [ventas, setVentas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [isCanjeModalOpen, setIsCanjeModalOpen] = useState(false);
  const [canjeSale, setCanjeSale] = useState<any | null>(null);
  const [canjeItems, setCanjeItems] = useState<CanjeItemState[]>([]);
  const [canjeObservaciones, setCanjeObservaciones] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isSubmittingCanje, setIsSubmittingCanje] = useState(false);

  const handleOpenCanjeModal = async (sale: any) => {
    setCanjeSale(sale);
    setIsCanjeModalOpen(true);
    setIsLoadingStock(true);
    setCanjeObservaciones('');

    try {
      const isRoute = sale.items?.some((i: any) => i.salida_id != null);
      let stockData: any[] = [];
      const vId = sale.vendedor_id || sale.vendedor?.id;
      if (isRoute && vId) {
        stockData = await ventaService.getProductosByVendedor(String(vId));
      } else {
        stockData = await ventaService.getProductosFabrica();
      }

      // Mapear stock disponible acumulado por producto_id
      const stockMap: Record<number, number> = {};
      stockData.forEach((st: any) => {
        const pId = st.producto_id || st.producto?.id;
        const disp = st.cantidad !== undefined ? st.cantidad : (st.stock !== undefined ? st.stock : 0);
        if (pId) {
          stockMap[pId] = (stockMap[pId] || 0) + Number(disp || 0);
        }
      });

      const itemsState: CanjeItemState[] = (sale.items || []).map((item: any) => {
        const tipoItem = item.es_bonificacion
          ? 'BONIFICACIÓN'
          : item.es_degustacion
          ? 'DEGUSTACIÓN'
          : 'VENTA';
        const stockDisp = stockMap[item.producto_id] ?? 0;
        const maxPosible = Math.max(0, Math.min(Number(item.cantidad), Number(stockDisp)));

        return {
          item_id: item.id,
          producto_id: item.producto_id,
          producto_nombre: item.producto?.nombre || 'Producto',
          tipo_item: tipoItem,
          cantidad_original: Number(item.cantidad),
          cantidad_canje: 0,
          stock_disponible: stockDisp,
          max_posible: maxPosible,
          motivo: 'Producto defectuoso reportado por cliente',
        };
      });

      setCanjeItems(itemsState);
    } catch (error) {
      console.error('Error al verificar stock disponible:', error);
      toast.error('No se pudo cargar el stock disponible para reposición.');
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleCanjeSubmit = async () => {
    if (!canjeSale) return;
    const activeItems = canjeItems.filter(i => Number(i.cantidad_canje) > 0);

    if (activeItems.length === 0) {
      toast.error('Indica una cantidad mayor a 0 en al menos un producto a canjear.');
      return;
    }

    for (const item of activeItems) {
      if (item.cantidad_canje > item.max_posible) {
        if (item.cantidad_canje > item.cantidad_original) {
          toast.error(`La cantidad para '${item.producto_nombre}' excede la cantidad entregada en la venta (${item.cantidad_original}).`);
        } else {
          toast.error(`No hay stock suficiente para reponer '${item.producto_nombre}'. Disponible: ${item.stock_disponible}.`);
        }
        return;
      }
    }

    setIsSubmittingCanje(true);
    try {
      const payloadItems = activeItems.map(i => ({
        venta_item_id: i.item_id,
        producto_id: i.producto_id,
        cantidad: Number(i.cantidad_canje),
        motivo: i.motivo,
      }));

      await ventaService.canjeDefectuoso(canjeSale.id, {
        items_defectuosos: payloadItems,
        items_reposicion: payloadItems,
        observaciones: canjeObservaciones
      });

      toast.success('Canje por productos defectuosos registrado correctamente');
      setIsCanjeModalOpen(false);
      setCanjeSale(null);
    } catch (error: any) {
      console.error('Error al realizar canje:', error);
      toast.error(formatErrorMessage('Error en el canje', error, 'No se pudo procesar el canje'));
    } finally {
      setIsSubmittingCanje(false);
    }
  };

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

      toast.success('Venta anulada correctamente');
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
        <CardContent className="p-2 sm:p-6">
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {paginatedSales.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron ventas
              </div>
            ) : (
              paginatedSales.map((sale) => (
                <div key={sale.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">
                        #{sale.codigo?.padStart(6, '0')}
                      </code>
                      <span className="font-bold text-sm text-foreground truncate">{sale.cliente?.razon_social}</span>
                    </div>
                    {getStatusBadge(sale.estado)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                    <div>📅 <strong className="text-foreground">{format(sale.fecha, "dd/MM/yyyy HH:mm", { locale: es })}</strong></div>
                    {sale.vendedor?.usuario?.nombre && <div>👤 <strong className="text-foreground truncate">{sale.vendedor.usuario.nombre}</strong></div>}
                    <div>💳 {getPaymentBadge(sale.tipo_pago)}</div>
                    <div>📦 <Badge variant="outline" className="text-[10px] py-0">{sale.items.length} items</Badge></div>
                  </div>
                  {sale.nota_pedido && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded border border-amber-200/50">
                      Nota de Pedido: <strong>{sale.nota_pedido}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Total Venta</span>
                      <span className="text-base font-bold text-foreground">S/ {Number(sale.total_neto).toFixed(2)}</span>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setSelectedSale(sale)}>
                          <Eye className="h-3.5 w-3.5" /> Ver Detalle
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
                        <DialogHeader>
                          <DialogTitle className="text-lg">Detalle de Venta #{sale.codigo?.padStart(6, '0')}</DialogTitle>
                          <DialogDescription className="text-xs">
                            {sale.cliente?.razon_social} - {format(sale.fecha, "dd/MM/yyyy HH:mm")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-3 pb-3 border-b text-xs sm:text-sm">
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
                              {sale.items.map((item: any) => (
                                <div key={item.id} className="p-2.5 flex justify-between items-center">
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium truncate">{item.producto?.nombre}</span>
                                      {Boolean(item.es_bonificacion) && (
                                        <Badge variant="outline" className="text-[10px] py-0 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200">
                                          BONIFICACIÓN
                                        </Badge>
                                      )}
                                      {Boolean(item.es_degustacion) && (
                                        <Badge variant="outline" className="text-[10px] py-0 bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200">
                                          DEGUSTACIÓN
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {Number(item.cantidad).toFixed(2)} x S/ {Number(item.precio_unitario).toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-semibold shrink-0">S/ {Number(item.subtotal).toFixed(2)}</p>
                                </div>
                              ))}
                          <div className="space-y-2 pt-3 border-t text-sm">
                            {sale.descuento > 0 && (
                              <div className="flex justify-between text-red-500 text-xs sm:text-sm">
                                <span>Descuento</span>
                                <span>- S/ {Number(sale.descuento).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-base sm:text-lg font-bold">
                              <span>Total</span>
                              <span>S/ {Number(sale.total_neto).toFixed(2)}</span>
                            </div>

                            {sale.estado === "BORRADOR" && (
                              <Button
                                onClick={() => handleConfirmSale(sale.id)}
                                className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-medium"
                                size="sm"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirmar Venta
                              </Button>
                            )}

                            {(sale.estado === "BORRADOR") && (
                              <Button
                                onClick={() => handleDeleteSale(sale.id)}
                                className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-medium"
                                size="sm"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Eliminar Venta
                              </Button>
                            )}

                              {sale.estado === "CONFIRMADA" && (
                                <>
                                  <Button
                                    onClick={() => handleOpenCanjeModal(sale)}
                                    className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white font-medium gap-2"
                                    size="sm"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Canje por Producto Defectuoso
                                  </Button>
                                  <Button
                                    onClick={() => handleCancelSale(sale.id)}
                                    className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-medium gap-2"
                                    size="sm"
                                  >
                                    <X className="h-4 w-4" />
                                    Anular Venta
                                  </Button>
                                </>
                              )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto w-full border rounded-lg">
            <Table className="w-full min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vendedor</TableHead>
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
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(sale.fecha, "dd MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {sale.vendedor?.usuario?.nombre}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {sale.cliente?.razon_social}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge variant="outline">{sale.items.length} items</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{getPaymentBadge(sale.tipo_pago)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {sale.nota_pedido ? (
                        <span className="font-mono text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded border border-amber-200/50 dark:border-amber-800/30">
                          {sale.nota_pedido}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{getStatusBadge(sale.estado)}</TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap">
                      S/ {Number(sale.total_neto).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
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
                        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
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
                            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                              {sale.items.map((item) => (
                                <div key={item.id} className="p-3 flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{item.producto?.nombre}</span>
                                      {Boolean(item.es_bonificacion) && (
                                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200">
                                          BONIFICACIÓN
                                        </Badge>
                                      )}
                                      {Boolean(item.es_degustacion) && (
                                        <Badge variant="outline" className="text-xs bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200">
                                          DEGUSTACIÓN
                                        </Badge>
                                      )}
                                    </div>
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
                                  className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-medium"
                                  size="sm"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Confirmar Venta
                                </Button>
                              )}

                              {(sale.estado === "BORRADOR") && (
                                <Button
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-medium"
                                  size="sm"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Eliminar Venta
                                </Button>
                              )}

                              {sale.estado === "CONFIRMADA" && (
                                <>
                                  <Button
                                    onClick={() => handleOpenCanjeModal(sale)}
                                    className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-medium gap-2"
                                    size="sm"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Canje por Producto Defectuoso
                                  </Button>
                                  <Button
                                    onClick={() => handleCancelSale(sale.id)}
                                    className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-medium gap-2"
                                    size="sm"
                                  >
                                    <X className="h-4 w-4" />
                                    Anular Venta
                                  </Button>
                                </>
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
          </div>
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

      {/* Modal de Canje por Productos Defectuosos */}
      <Dialog open={isCanjeModalOpen} onOpenChange={setIsCanjeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Canje por Productos Defectuosos (Venta #{canjeSale?.codigo?.padStart(6, '0')})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Los productos defectuosos retornados serán reemplazados 1-a-1 por unidades de reposición.
            </DialogDescription>
          </DialogHeader>

          {canjeSale && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                <p><strong>Cliente:</strong> {canjeSale.cliente?.razon_social}</p>
                <p><strong>Vendedor:</strong> {canjeSale.vendedor?.usuario?.nombre}</p>
                <p>
                  <strong>Origen Reposición:</strong>{' '}
                  {canjeSale.items?.some((i: any) => i.salida_id)
                    ? '🚚 Stock de Ruta del Vendedor'
                    : '🏢 Stock Central de Fábrica'}
                </p>
              </div>

              {isLoadingStock ? (
                <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Verificando stock disponible para reposición...</span>
                </div>
              ) : (
                <div className="space-y-3 border p-3 rounded-lg bg-card">
                  <Label className="font-semibold text-foreground text-xs block">
                    Productos a Canjear (Retorno Defectuoso ➔ Reposición 1-a-1)
                  </Label>
                  <div className="space-y-2">
                    {canjeItems.map((item) => {
                      const isSinStock = item.stock_disponible <= 0;
                      return (
                        <div
                          key={`canje-item-${item.item_id}`}
                          className="p-3 rounded-lg border bg-background space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-sm truncate">{item.producto_nombre}</span>
                              {item.tipo_item === 'VENTA' && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px]">
                                  VENDIDO
                                </Badge>
                              )}
                              {item.tipo_item === 'BONIFICACIÓN' && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 text-[10px]">
                                  BONIFICACIÓN
                                </Badge>
                              )}
                              {item.tipo_item === 'DEGUSTACIÓN' && (
                                <Badge variant="outline" className="bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 text-[10px]">
                                  DEGUSTACIÓN
                                </Badge>
                              )}
                            </div>
                            <div className="text-right text-[11px] text-muted-foreground">
                              <span>Entregado: <strong className="text-foreground">{item.cantidad_original} uds</strong></span>
                              <span className="mx-1.5">•</span>
                              <span>Stock disponible: <strong className={item.stock_disponible > 0 ? "text-blue-600 font-bold" : "text-red-600 font-bold"}>{item.stock_disponible} uds</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                            {isSinStock ? (
                              <div className="w-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-2 rounded text-xs font-semibold">
                                ⚠️ No hay stock disponible de este producto para entregar reposición.
                              </div>
                            ) : (
                              <>
                                <div className="text-[11px] text-muted-foreground">
                                  <span>Cantidad a canjear (Máx: {item.max_posible}):</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.max_posible}
                                    value={item.cantidad_canje}
                                    onChange={(e) => {
                                      const val = Math.max(0, Math.min(item.max_posible, Number(e.target.value)));
                                      setCanjeItems(prev => prev.map(ci => ci.item_id === item.item_id ? { ...ci, cantidad_canje: val } : ci));
                                    }}
                                    className="w-24 h-8 text-xs font-bold"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Observaciones / Motivo del Canje</Label>
                <Textarea
                  placeholder="Detalla el motivo del cambio (ej: empaque dañado, fecha corta, etc.)"
                  value={canjeObservaciones}
                  onChange={(e) => setCanjeObservaciones(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCanjeModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCanjeSubmit}
              disabled={isSubmittingCanje || isLoadingStock || canjeItems.every(i => i.cantidad_canje <= 0)}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {isSubmittingCanje ? 'Procesando...' : 'Confirmar Canje Defectuoso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesHistory;
