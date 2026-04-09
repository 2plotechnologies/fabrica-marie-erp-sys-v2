import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  BarChart3,
  Filter,
  Download,
  Users,
  Banknote,
  Navigation,
  Smartphone,
  Wallet,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { entregaDineroService } from '@/services/entregaDineroService';

const PAYMENT_COLORS = [
  'hsl(var(--primary))',  // Efectivo
  'hsl(217, 91%, 60%)',   // Transferencia
  'hsl(142, 76%, 36%)',   // Deposito
  'hsl(280, 67%, 55%)',   // Otro
];

const DeliveryReport = () => {
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [filterMetodoPago, setFilterMetodoPago] = useState<string>('all');

  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, 'yyyy-MM-dd');
  });
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [entregas, setEntregas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setIsLoading(true);
      try {
        const data = await entregaDineroService.getReporte(fechaDesde, fechaHasta);
        setEntregas(data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatos();
  }, [fechaDesde, fechaHasta]);

  // Extraer lista única de vendedores para el filtro
  const vendedores = useMemo(() => {
    const uniqueMap = new Map();
    entregas.forEach(e => {
      if (e.usuario) {
        uniqueMap.set(e.usuario.id, e.usuario);
      }
    });
    return Array.from(uniqueMap.values());
  }, [entregas]);

  // Aggregate data
  const { vendorSummary, totals, paymentBreakdown } = useMemo(() => {
    // 1. Filtrar entregas según el método de pago seleccionado
    // Si metoda_pago !== 'all', consideramos solo las entregas que tengan al menos
    // un item con ese método de pago, y para los totales, solo sumamos esos items.

    const filteredByVendor = entregas.filter(e => filterVendedor === 'all' || e.usuario_id.toString() === filterVendedor.toString());

    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalDeposito = 0;
    let totalOtro = 0;
    let totalAprobado = 0;
    let totalRechazado = 0;
    let totalPendiente = 0;

    const vendorMap = new Map(); // id -> datos

    filteredByVendor.forEach(entrega => {
      let matchedItems = entrega.items || [];
      if (filterMetodoPago !== 'all') {
        matchedItems = matchedItems.filter((i: any) => i.metodo_pago === filterMetodoPago);
      }

      if (matchedItems.length === 0) return; // No pasa el filtro

      const v_id = entrega.usuario_id;
      if (!vendorMap.has(v_id)) {
        vendorMap.set(v_id, {
          id: v_id,
          nombre: entrega.usuario?.nombre || 'Usuario Desconocido',
          rol: entrega.usuario?.roles[0].nombre || '—',
          efectivo: 0,
          transferencia: 0,
          deposito: 0,
          otro: 0,
          totalMonto: 0,
          aprobadas: 0,
          pendientes: 0,
          rechazadas: 0,
          totalEntregas: 0
        });
      }

      const vData = vendorMap.get(v_id);

      let entregaEfectivo = 0;
      let entregaTransferencia = 0;
      let entregaDeposito = 0;
      let entregaOtro = 0;
      let entregaTotalValida = 0; // Suma solo de items filtrados

      matchedItems.forEach((item: any) => {
        const monto = Number(item.monto) || 0;
        entregaTotalValida += monto;

        const mp = item.metodo_pago?.toLowerCase();
        if (mp === 'efectivo') {
          entregaEfectivo += monto;
          totalEfectivo += monto;
        } else if (mp === 'transferencia' || mp === 'yape' || mp === 'plin') {
          entregaTransferencia += monto;
          totalTransferencia += monto;
        } else if (mp === 'deposito' || mp === 'depósito') {
          entregaDeposito += monto;
          totalDeposito += monto;
        } else {
          entregaOtro += monto;
          totalOtro += monto;
        }
      });

      vData.efectivo += entregaEfectivo;
      vData.transferencia += entregaTransferencia;
      vData.deposito += entregaDeposito;
      vData.otro += entregaOtro;
      vData.totalMonto += entregaTotalValida;
      vData.totalEntregas += 1;

      if (entrega.estado === 'ACEPTADA' || entrega.estado === 'APROBADA') {
        vData.aprobadas += 1;
        totalAprobado += entregaTotalValida;
      } else if (entrega.estado === 'RECHAZADA') {
        vData.rechazadas += 1;
        totalRechazado += entregaTotalValida;
      } else {
        vData.pendientes += 1;
        totalPendiente += entregaTotalValida;
      }
    });

    const vendorSummaryArray = Array.from(vendorMap.values()).sort((a, b) => b.totalMonto - a.totalMonto);

    const totalsObj = {
      efectivo: totalEfectivo,
      transferencia: totalTransferencia,
      deposito: totalDeposito,
      otro: totalOtro,
      aprobado: totalAprobado,
      rechazado: totalRechazado,
      pendiente: totalPendiente,
      general: totalEfectivo + totalTransferencia + totalDeposito + totalOtro
    };

    const paymentBreakdownArr = [
      { name: 'Efectivo', value: totalEfectivo, icon: Banknote },
      { name: 'Transferencia', value: totalTransferencia, icon: Smartphone },
      { name: 'Depósito', value: totalDeposito, icon: Wallet },
      { name: 'Otro', value: totalOtro, icon: Banknote }
    ];

    return { vendorSummary: vendorSummaryArray, totals: totalsObj, paymentBreakdown: paymentBreakdownArr };
  }, [entregas, filterVendedor, filterMetodoPago]);

  const chartData = vendorSummary
    .filter(v => v.totalMonto > 0)
    .slice(0, 10) // Top 10 para graficos
    .map(v => ({
      name: v.nombre.split(' ')[0] || 'N/A',
      Efectivo: v.efectivo,
      Transferencia: v.transferencia,
      Depósito: v.deposito,
      Otro: v.otro,
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Reporte de Entregas de Dinero</h1>
          <p className="text-muted-foreground mt-1">
            Visualización y seguimiento de fondos entregados a los administradores y gerentes.
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Usuario</Label>
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id.toString()}>{v.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Método de Pago</Label>
          <Select value={filterMetodoPago} onValueChange={setFilterMetodoPago}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="deposito">Depósito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Desde</Label>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Hasta</Label>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Suma Total de Entregas</p>
                <p className="text-lg font-bold">S/ {totals.general.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entregas Aprobadas</p>
                <p className="text-lg font-bold">S/ {totals.aprobado.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">S/ {totals.pendiente.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rechazadas</p>
                <p className="text-lg font-bold">S/ {totals.rechazado.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        {/* Deliveries by Vendor Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Entregas por Usuario (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`S/ ${value.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="Efectivo" fill="hsl(var(--primary))" stackId="a" />
                  <Bar dataKey="Transferencia" fill="hsl(217, 91%, 60%)" stackId="a" />
                  <Bar dataKey="Depósito" fill="hsl(142, 76%, 36%)" stackId="a" />
                  <Bar dataKey="Otro" fill="hsl(280, 67%, 55%)" radius={[2, 2, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No hay datos para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-primary" />
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={paymentBreakdown.filter(p => p.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentBreakdown.map((_, index) => (
                        <Cell key={index} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`S/ ${value.toLocaleString()}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 w-full sm:w-auto">
                {paymentBreakdown.map((method, i) => (
                  <div key={method.name} className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }}
                    />
                    <div>
                      <p className="text-xs text-muted-foreground">{method.name}</p>
                      <p className="text-sm font-semibold">S/ {method.value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="shadow-card animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Detalle por Usuario
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Cant. Entregas</TableHead>
                  <TableHead className="text-right">Efectivo</TableHead>
                  <TableHead className="text-right">Transferencia</TableHead>
                  <TableHead className="text-right">Depósito/Otro</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : vendorSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {vendorSummary.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{v.nombre}</p>
                            <p className="text-xs text-muted-foreground">ID: {v.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.rol || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {v.totalEntregas}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {v.efectivo.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                          S/ {v.transferencia.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                          S/ {(v.deposito + v.otro).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          S/ {v.totalMonto.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {v.aprobadas > 0 && (
                              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-xs">
                                {v.aprobadas} Aprob.
                              </Badge>
                            )}
                            {v.pendientes > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {v.pendientes} Pend.
                              </Badge>
                            )}
                            {v.rechazadas > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {v.rechazadas} Rechaz.
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTALES</TableCell>
                      <TableCell />
                      <TableCell className="text-center">
                        {vendorSummary.reduce((acc, curr) => acc + curr.totalEntregas, 0)}
                      </TableCell>
                      <TableCell className="text-right">S/ {totals.efectivo.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">
                        S/ {totals.transferencia.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        S/ {(totals.deposito + totals.otro).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        S/ {totals.general.toLocaleString()}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryReport;
