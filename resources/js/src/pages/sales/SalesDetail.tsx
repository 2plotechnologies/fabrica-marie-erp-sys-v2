import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FileDown, ShoppingCart, Users, Truck, Search, Eye, DollarSign, Package, Gift, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { detalleVentaService } from '@/services/detalleVentaService';

// Tipos basados en el Excel
interface SaleDetailItem {
  id: string;
  presentacion: string;
  cantidad: number;
  precio: string;
  total: number;
  bonificacion: boolean;
  degustacion: boolean;
  condicionVenta: 'CONTADO' | 'CREDITO' | 'DEPOSITO';
  notaPedido: string;
  tipoCliente: 'DISTRIBUIDOR' | 'MAYORISTA' | 'SUPER_MAYORISTA' | 'TIENDA' | 'MINIMARKET';
}

interface AbonoDetailItem {
  id: string;
  monto: number;
  metodoPago?: string;
  banco?: string;
  numeroOperacion?: string;
  referencia?: string;
  fecha: string;
  estado?: string;
}

interface CuentaDetail {
  id: string;
  montoTotal: number;
  saldo: number;
  estado: string;
  fechaVencimiento?: string;
  abonos?: AbonoDetailItem[];
}

interface SaleDetail {
  id: string;
  fecha: string;
  vehiculoId: string | null;
  vehiculoPlaca: string | null;
  vendedor: string;
  vendedorId: string;
  cliente: string;
  clienteId: string;
  items: SaleDetailItem[];
  subtotal: number;
  totalBonificacion: number;
  totalDegustacion: number;
  total: string;
  condicionVenta: 'CONTADO' | 'CREDITO' | 'DEPOSITO';
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin' | 'deposito' | string;
  notaPedido: string;
  tipoCliente: string;
  createdAt: string;
  adelanto?: number;
  cuenta?: CuentaDetail | null;
}

// Tipo para promociones/degustaciones detalladas
interface PromocionDegustacion {
  id: string;
  fecha: Date;
  vendedor: string;
  vehiculoPlaca: string;
  cliente: string;
  clienteId: string;
  tipoCliente: string;
  producto: string;
  tipo: 'PROMOCION' | 'DEGUSTACION';
  cantidad: number;
  valorEstimado: number;
  motivo: string;
  ruta: string;
  diaRuta: number; // Día 1, 2, 3... de la ruta (para rutas largas)
}

const isVentaDeposito = (v: SaleDetail) => {
  const cond = (v.condicionVenta || '').toUpperCase();
  const metodo = (v.metodoPago || '').toUpperCase();
  return cond === 'DEPOSITO' || ['DEPOSITO', 'TRANSFERENCIA', 'YAPE', 'PLIN'].includes(metodo);
};

const SalesDetailPage = () => {
  const [ventas, setVentas] = useState<SaleDetail[]>([]);
  const [promociones, setPromociones] = useState<PromocionDegustacion[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [filterCliente, setFilterCliente] = useState<string>('all');
  const [filterCondicion, setFilterCondicion] = useState<string>('all');
  const [filterTipoCliente, setFilterTipoCliente] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { locale: es }),
    to: endOfWeek(new Date(), { locale: es }),
  });
  const [selectedVenta, setSelectedVenta] = useState<SaleDetail | null>(null);

  const fetchVentas = async (dateRange: { from: Date; to: Date }) => {
    try {
      const response = await detalleVentaService.getDetalleVentas({
        fechaInicio: dateRange.from.toISOString().split('T')[0],
        fechaFin: dateRange.to.toISOString().split('T')[0],
      });
      setVentas(response.ventas || []);
      setPromociones(response.promociones || []);
    } catch (error) {
      console.error('Error al obtener ventas:', error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const response = await detalleVentaService.getVendedores();
      setVendedores(response);
    } catch (error) {
      console.error('Error al obtener vendedores:', error);
    }
  };

  useEffect(() => {
    fetchVentas(dateRange);
    fetchVendedores();
  }, [dateRange]);

  const uniqueVendedores = Array.from(new Map(ventas.map(v => [v.vendedor, { id: v.vendedor, nombre: v.vendedor, placa: v.vehiculoPlaca || 'Venta Directa' }])).values());
  const uniqueClientes = Array.from(new Map(ventas.map(v => [v.clienteId, { id: v.clienteId, nombre: v.cliente, tipo: v.tipoCliente }])).values());

  // Filtrar ventas
  const filteredVentas = ventas.filter(venta => {
    const matchesSearch = venta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.notaPedido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendedor = filterVendedor === 'all' || venta.vendedorId === filterVendedor;
    const matchesCliente = filterCliente === 'all' || venta.clienteId === filterCliente;
    const matchesCondicion = filterCondicion === 'all' ||
      (filterCondicion === 'DEPOSITO' ? isVentaDeposito(venta) : venta.condicionVenta === filterCondicion);
    const matchesTipo = filterTipoCliente === 'all' || venta.tipoCliente === filterTipoCliente;
    const vFecha = new Date(venta.fecha);
    const inRange = isNaN(vFecha.getTime()) ? true : (vFecha >= dateRange.from && vFecha <= dateRange.to);
    return matchesSearch && matchesVendedor && matchesCliente && matchesCondicion && matchesTipo && inRange;
  });

  // KPIs
  const totalVentas = filteredVentas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  const ventasContado = filteredVentas.filter(v => v.condicionVenta === 'CONTADO').reduce((acc, v) => acc + Number(v.total || 0), 0);
  const ventasCredito = filteredVentas.filter(v => v.condicionVenta === 'CREDITO').reduce((acc, v) => acc + Number(v.total || 0), 0);
  const ventasDeposito = filteredVentas.filter(isVentaDeposito).reduce((acc, v) => acc + Number(v.total || 0), 0);
  const totalBonificaciones = filteredVentas.reduce((acc, v) => acc + Number(v.totalBonificacion || 0), 0);
  const totalDegustaciones = filteredVentas.reduce((acc, v) => acc + Number(v.totalDegustacion || 0), 0);
  const clientesAtendidos = new Set(filteredVentas.map(v => v.clienteId)).size;

  const getCondicionBadge = (condicion: string) => {
    switch (condicion) {
      case 'CONTADO':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Contado</Badge>;
      case 'CREDITO':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">Crédito</Badge>;
      case 'DEPOSITO':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Depósito</Badge>;
      default:
        return <Badge variant="outline">{condicion}</Badge>;
    }
  };

  const getTipoClienteBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      'DISTRIBUIDOR': 'bg-purple-500/10 text-purple-500',
      'MAYORISTA': 'bg-blue-500/10 text-blue-500',
      'SUPER_MAYORISTA': 'bg-indigo-500/10 text-indigo-500',
      'TIENDA': 'bg-emerald-500/10 text-emerald-500',
      'MINIMARKET': 'bg-amber-500/10 text-amber-500',
    };
    const labels: Record<string, string> = {
      'DISTRIBUIDOR': 'D',
      'MAYORISTA': 'M',
      'SUPER_MAYORISTA': 'SM',
      'TIENDA': 'T',
      'MINIMARKET': 'CM',
    };
    return <Badge className={colors[tipo] || ''}>{labels[tipo] || tipo}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Detalle de Ventas</h1>
          <p className="text-muted-foreground">Reporte detallado de ventas por carro-vendedor</p>
        </div>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <DollarSign className="h-5 w-5 text-emerald-500 mb-2" />
              <p className="text-xs text-muted-foreground">Total Ventas</p>
              <p className="text-lg font-bold text-foreground">S/ {totalVentas.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <DollarSign className="h-5 w-5 text-green-500 mb-2" />
              <p className="text-xs text-muted-foreground">Contado</p>
              <p className="text-lg font-bold text-foreground">S/ {ventasContado.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <DollarSign className="h-5 w-5 text-amber-500 mb-2" />
              <p className="text-xs text-muted-foreground">Crédito</p>
              <p className="text-lg font-bold text-foreground">S/ {ventasCredito.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <DollarSign className="h-5 w-5 text-blue-500 mb-2" />
              <p className="text-xs text-muted-foreground">Depósito</p>
              <p className="text-lg font-bold text-foreground">S/ {ventasDeposito.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <Package className="h-5 w-5 text-purple-500 mb-2" />
              <p className="text-xs text-muted-foreground">Bonificaciones</p>
              <p className="text-lg font-bold text-foreground">{totalBonificaciones} uds</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <Package className="h-5 w-5 text-pink-500 mb-2" />
              <p className="text-xs text-muted-foreground">Degustaciones</p>
              <p className="text-lg font-bold text-foreground">{totalDegustaciones} uds</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <Users className="h-5 w-5 text-cyan-500 mb-2" />
              <p className="text-xs text-muted-foreground">Clientes</p>
              <p className="text-lg font-bold text-foreground">{clientesAtendidos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o nota de pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterVendedor} onValueChange={setFilterVendedor}>
              <SelectTrigger>
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vendedores</SelectItem>
                {vendedores.map(v => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.usuario?.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCondicion} onValueChange={setFilterCondicion}>
              <SelectTrigger>
                <SelectValue placeholder="Condición" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las condiciones</SelectItem>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="CREDITO">Crédito</SelectItem>
                <SelectItem value="DEPOSITO">Depósito</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTipoCliente} onValueChange={setFilterTipoCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="DISTRIBUIDOR">Distribuidor (D)</SelectItem>
                <SelectItem value="MAYORISTA">Mayorista (M)</SelectItem>
                <SelectItem value="SUPER_MAYORISTA">Super Mayorista (SM)</SelectItem>
                <SelectItem value="TIENDA">Tienda (T)</SelectItem>
                <SelectItem value="MINIMARKET">Minimarket (CM)</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({
                      from: startOfWeek(new Date(), { locale: es }),
                      to: endOfWeek(new Date(), { locale: es })
                    })}
                  >
                    Esta semana
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({
                      from: startOfMonth(new Date()),
                      to: endOfMonth(new Date())
                    })}
                  >
                    Este mes
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de reportes */}
      <Tabs defaultValue="detalle" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="detalle">Detalle de Ventas</TabsTrigger>
          <TabsTrigger value="vendedor">Por Vendedor</TabsTrigger>
          <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
          <TabsTrigger value="producto">Por Producto</TabsTrigger>
          <TabsTrigger value="promociones" className="flex items-center gap-1">
            <Gift className="h-3 w-3" />
            Promociones/Degustaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalle">
          <Card>
            <CardContent className="p-2 sm:p-6">
              {/* Mobile Card View */}
              <div className="space-y-3 sm:hidden">
                {filteredVentas.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No se encontraron ventas
                  </div>
                ) : (
                  filteredVentas.map((venta) => (
                    <div key={venta.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{venta.notaPedido || '-'}</span>
                          <span className="font-bold text-sm text-foreground truncate">{venta.cliente}</span>
                        </div>
                        {getCondicionBadge(venta.condicionVenta)}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                        <div>📅 <strong className="text-foreground">{venta.fecha}</strong></div>
                        <div>👤 <strong className="text-foreground truncate">{venta.vendedor}</strong></div>
                        <div>🏷️ {getTipoClienteBadge(venta.tipoCliente)}</div>
                        <div>📦 <Badge variant="outline" className="text-[10px] py-0">{venta.items.length} items</Badge></div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border/50">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Total Venta</span>
                          <span className="text-base font-bold text-foreground">S/ {Number(venta.total).toLocaleString()}</span>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={() => setSelectedVenta(venta)}>
                          <Eye className="h-3.5 w-3.5" /> Ver Detalle
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto w-full border rounded-lg">
                <Table className="w-full min-w-[850px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>N° Pedido</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Bonif.</TableHead>
                      <TableHead className="text-right">Degust.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVentas.map((venta) => (
                      <TableRow key={venta.id}>
                        <TableCell className="whitespace-nowrap">{venta.fecha}</TableCell>
                        <TableCell className="font-mono whitespace-nowrap">{venta.notaPedido}</TableCell>
                        <TableCell className="whitespace-nowrap">{venta.vendedor}</TableCell>
                        <TableCell className="whitespace-nowrap">{venta.cliente}</TableCell>
                        <TableCell className="whitespace-nowrap">{getTipoClienteBadge(venta.tipoCliente)}</TableCell>
                        <TableCell className="whitespace-nowrap">{getCondicionBadge(venta.condicionVenta)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{venta.items.length}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{venta.totalBonificacion}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{venta.totalDegustacion}</TableCell>
                        <TableCell className="text-right font-bold whitespace-nowrap">S/ {Number(venta.total).toLocaleString()}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedVenta(venta)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendedor">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendedores.map(vendedor => {
                  const ventasVendedor = filteredVentas.filter(v => v.vendedor === vendedor.usuario?.nombre);
                  const totalVendedor = ventasVendedor.reduce((acc, v) => acc + Number(v.total), 0);
                  const clientesVendedor = new Set(ventasVendedor.map(v => v.clienteId)).size;

                  return (
                    <Card key={vendedor.id} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Truck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{vendedor.usuario?.nombre || vendedor.nombre}</p>
                              <p className="text-sm text-muted-foreground">{vendedor.placa || (ventasVendedor[0]?.vehiculoPlaca || "Sin Vehículo")}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Ventas</p>
                            <p className="font-bold">{ventasVendedor.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Clientes</p>
                            <p className="font-bold">{clientesVendedor}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="font-bold text-lg">S/ {totalVendedor.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cliente">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">N° Compras</TableHead>
                    <TableHead className="text-right">Total Comprado</TableHead>
                    <TableHead className="text-right">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueClientes.map(cliente => {
                    const ventasCliente = filteredVentas.filter(v => v.clienteId === cliente.id);
                    const totalCliente = ventasCliente.reduce((acc, v) => acc + Number(v.total), 0);
                    const promedio = ventasCliente.length > 0 ? totalCliente / ventasCliente.length : 0;

                    return (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.nombre}</TableCell>
                        <TableCell>{getTipoClienteBadge(cliente.tipo)}</TableCell>
                        <TableCell className="text-right">{ventasCliente.length}</TableCell>
                        <TableCell className="text-right font-bold">S/ {totalCliente.toLocaleString()}</TableCell>
                        <TableCell className="text-right">S/ {promedio.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producto">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad Vendida</TableHead>
                    <TableHead className="text-right">Bonificaciones</TableHead>
                    <TableHead className="text-right">Degustaciones</TableHead>
                    <TableHead className="text-right">Total Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const productosMap = new Map<string, { cantidad: number; bonif: number; degust: number; total: number }>();
                    filteredVentas.forEach(v => {
                      v.items.forEach(item => {
                        const existing = productosMap.get(item.presentacion) || { cantidad: 0, bonif: 0, degust: 0, total: 0 };
                        productosMap.set(item.presentacion, {
                          cantidad: existing.cantidad + Number(item.cantidad || 0),
                          bonif: existing.bonif + (item.bonificacion ? 1 : 0),
                          degust: existing.degust + (item.degustacion ? 1 : 0),
                          total: existing.total + Number(item.total || 0),
                        });
                      });
                    });

                    return Array.from(productosMap.entries()).map(([producto, data]) => (
                      <TableRow key={producto}>
                        <TableCell className="font-medium">{producto}</TableCell>
                        <TableCell className="text-right">{data.cantidad}</TableCell>
                        <TableCell className="text-right">{data.bonif}</TableCell>
                        <TableCell className="text-right">{data.degust}</TableCell>
                        <TableCell className="text-right font-bold">S/ {data.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nueva pestaña de Promociones/Degustaciones */}
        <TabsContent value="promociones">
          <div className="space-y-4">
            {/* KPIs de Promociones */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
                <CardContent className="pt-4">
                  <div className="flex flex-col">
                    <Gift className="h-5 w-5 text-pink-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Total Degustaciones</p>
                    <p className="text-lg font-bold text-foreground">
                      {promociones.filter(p => p.tipo === 'DEGUSTACION').reduce((acc, p) => acc + (p.cantidad || 0), 0)} uds
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex flex-col">
                    <Package className="h-5 w-5 text-purple-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Total Promociones</p>
                    <p className="text-lg font-bold text-foreground">
                      {promociones.filter(p => p.tipo === 'PROMOCION').reduce((acc, p) => acc + (p.cantidad || 0), 0)} uds
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex flex-col">
                    <DollarSign className="h-5 w-5 text-amber-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Valor Estimado Total</p>
                    <p className="text-lg font-bold text-foreground">
                      S/ {promociones.reduce((acc, p) => acc + (p.valorEstimado || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                <CardContent className="pt-4">
                  <div className="flex flex-col">
                    <Users className="h-5 w-5 text-cyan-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Clientes Beneficiados</p>
                    <p className="text-lg font-bold text-foreground">
                      {new Set(promociones.map(p => p.clienteId)).size}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla de Promociones/Degustaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Detalle de Promociones y Degustaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ruta / Día</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo Cliente</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Valor Est.</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promociones.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{format(item.fecha, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{item.ruta}</span>
                            <Badge variant="outline" className="ml-1 text-xs">Día {item.diaRuta}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.vendedor}</p>
                            <p className="text-xs text-muted-foreground">{item.vehiculoPlaca}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.cliente}</TableCell>
                        <TableCell>{getTipoClienteBadge(item.tipoCliente)}</TableCell>
                        <TableCell>{item.producto}</TableCell>
                        <TableCell>
                          <Badge className={item.tipo === 'DEGUSTACION'
                            ? 'bg-pink-500/10 text-pink-500 border-pink-500/30'
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                          }>
                            {item.tipo === 'DEGUSTACION' ? 'Degustación' : 'Promoción'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{item.cantidad}</TableCell>
                        <TableCell className="text-right">S/ {Number(item.valorEstimado || 0).toFixed(2)}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm text-muted-foreground">{item.motivo}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Resumen por Vendedor/Ruta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Vendedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uniqueVendedores.map(vendedor => {
                      const promocionesVendedor = promociones.filter(p => p.vendedor === vendedor.nombre);
                      const totalUnidades = promocionesVendedor.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
                      const totalValor = promocionesVendedor.reduce((acc, p) => acc + (Number(p.valorEstimado) || 0), 0);

                      if (promocionesVendedor.length === 0) return null;

                      return (
                        <div key={vendedor.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Truck className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{vendedor.nombre}</p>
                              <p className="text-xs text-muted-foreground">{vendedor.placa}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{totalUnidades} uds</p>
                            <p className="text-xs text-muted-foreground">S/ {totalValor.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Tipo de Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['DISTRIBUIDOR', 'MAYORISTA', 'SUPER_MAYORISTA', 'TIENDA', 'MINIMARKET'].map(tipo => {
                      const promocionesTipo = promociones.filter(p => p.tipoCliente === tipo);
                      const totalUnidades = promocionesTipo.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
                      const totalValor = promocionesTipo.reduce((acc, p) => acc + (Number(p.valorEstimado) || 0), 0);

                      if (promocionesTipo.length === 0) return null;

                      return (
                        <div key={tipo} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getTipoClienteBadge(tipo)}
                            <span className="text-sm font-medium">{promocionesTipo.length} entregas</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{totalUnidades} uds</p>
                            <p className="text-xs text-muted-foreground">S/ {totalValor.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de detalle */}
      <Dialog open={!!selectedVenta} onOpenChange={() => setSelectedVenta(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-4xl p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Detalle de Venta - {selectedVenta?.notaPedido}</DialogTitle>
          </DialogHeader>

          {selectedVenta && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{selectedVenta.fecha}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedVenta.cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedVenta.vendedor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehículo / Origen</p>
                  <p className="font-medium">{selectedVenta.vehiculoPlaca || "Venta Directa (Fábrica)"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Condición</p>
                  {getCondicionBadge(selectedVenta.condicionVenta)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Productos Vendidos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Presentación</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Bonif.</TableHead>
                      <TableHead className="text-right">Degust.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVenta.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.presentacion}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">S/ {Number(item.precio).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.bonificacion ? 'Sí' : 'No'}</TableCell>
                        <TableCell className="text-right">{item.degustacion ? 'Sí' : 'No'}</TableCell>
                        <TableCell className="text-right font-bold">S/ {Number(item.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="text-right font-bold">Total Venta:</TableCell>
                      <TableCell className="text-right font-bold text-lg">S/ {Number(selectedVenta.total).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Información de Crédito, Adelanto y Abonos */}
              {(selectedVenta.condicionVenta === 'CREDITO' || selectedVenta.cuenta || (selectedVenta.adelanto && selectedVenta.adelanto > 0)) && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-bold text-foreground">Estado de Crédito y Abonos</h3>
                    {selectedVenta.cuenta?.estado && (
                      <Badge className={
                        selectedVenta.cuenta.estado === 'PAGADO' ? 'bg-emerald-500/10 text-emerald-500' :
                        selectedVenta.cuenta.estado === 'PARCIAL' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }>
                        {selectedVenta.cuenta.estado}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Monto Total Crédito</p>
                      <p className="font-semibold text-foreground">S/ {Number(selectedVenta.total).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Adelanto Inicial</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        S/ {Number(selectedVenta.adelanto || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                      <p className="font-bold text-amber-600 dark:text-amber-400">
                        S/ {Number(selectedVenta.cuenta?.saldo ?? (Number(selectedVenta.total) - Number(selectedVenta.adelanto || 0))).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Historial de Pagos / Abonos registrados</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto / Referencia</TableHead>
                          <TableHead>Método de Pago</TableHead>
                          <TableHead>Banco / Op.</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVenta.adelanto && selectedVenta.adelanto > 0 && (
                          <TableRow className="bg-emerald-500/5">
                            <TableCell>{selectedVenta.fecha}</TableCell>
                            <TableCell className="font-medium text-emerald-700 dark:text-emerald-300">
                              Adelanto Inicial
                            </TableCell>
                            <TableCell className="capitalize">{selectedVenta.metodoPago || 'Efectivo'}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                              S/ {Number(selectedVenta.adelanto).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )}
                        {selectedVenta.cuenta?.abonos && selectedVenta.cuenta.abonos.length > 0 ? (
                          selectedVenta.cuenta.abonos.map((abono) => (
                            <TableRow key={abono.id}>
                              <TableCell>{abono.fecha}</TableCell>
                              <TableCell className="font-medium">{abono.referencia || 'Abono a cuenta'}</TableCell>
                              <TableCell className="capitalize">{abono.metodoPago || '-'}</TableCell>
                              <TableCell>
                                {abono.banco && abono.banco !== '-' ? abono.banco : ''} 
                                {abono.numeroOperacion && abono.numeroOperacion !== '-' ? ` (Op: ${abono.numeroOperacion})` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                S/ {Number(abono.monto).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : null}

                        {(!selectedVenta.adelanto || selectedVenta.adelanto <= 0) &&
                         (!selectedVenta.cuenta?.abonos || selectedVenta.cuenta.abonos.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              No hay adelantos ni abonos registrados para esta venta.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesDetailPage;
