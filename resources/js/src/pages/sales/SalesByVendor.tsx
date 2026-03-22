import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  BarChart3,
  Filter,
  Download,
  Users,
  Banknote,
  CreditCard,
  Receipt,
  Wallet,
  Building2,
  Smartphone,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { resumenDiarioService } from '@/services/resumenDiarioService';

const PAYMENT_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(217, 91%, 60%)',
  'hsl(280, 67%, 55%)',
];

const SalesByVendor = () => {
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, 'yyyy-MM-dd');
  });
  const [fechaHasta, setFechaHasta] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [resumenes, setResumenes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      setIsLoading(true);
      try {
        const data = await resumenDiarioService.getResumenGeneral();
        setResumenes(data.resumenDiario || []);

        const vends = await resumenDiarioService.getVendedores();
        setVendedores(vends);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatos();
  }, []);

  // Aggregate data by vendor
  const vendorSummary = vendedores.map(v => {
    const vendorResumenes = resumenes.filter(r => {
      if (r.vendedor_id !== v.id) return false;
      const date = r.fecha;
      if (fechaDesde && date < fechaDesde) return false;
      if (fechaHasta && date > fechaHasta) return false;
      return true;
    });

    const totalGastos = vendorResumenes.reduce((s, r) => s + (Number(r.total_gastos) || 0), 0);
    const totalCobranzas = vendorResumenes.reduce((s, r) => s + (Number(r.cobranza) || 0), 0);
    const totalVentasContado = vendorResumenes.reduce((s, r) => s + (Number(r.contado) || 0), 0);
    const totalCredito = vendorResumenes.reduce((s, r) => s + (Number(r.credito) || 0), 0);
    const totalAdelantos = vendorResumenes.reduce((s, r) => s + (Number(r.adelanto) || 0), 0);
    const totalDepositos = vendorResumenes.reduce((s, r) => s + (Number(r.depositos) || 0), 0);
    const totalViaticos = vendorResumenes.reduce((s, r) => s + (Number(r.viaticos) || 0), 0);

    const aprobados = vendorResumenes.filter(r => r.estado === 'APROBADO').length;
    const pendientes = vendorResumenes.filter(r => r.estado === 'BORRADOR' || r.estado === 'PENDIENTE').length;

    const zona = vendorResumenes.length > 0 ? vendorResumenes[0].zona : v.zona;

    return {
      id: v.id,
      nombre: v.usuario?.nombre || 'N/A',
      codigo: v.id,
      zona: zona,
      contado: totalVentasContado,
      credito: totalCredito,
      cobranzas: totalCobranzas,
      adelantos: totalAdelantos,
      depositos: totalDepositos,
      totalIngresos: totalVentasContado + totalCredito + totalCobranzas,
      totalGastos: totalGastos,
      totalViaticos: totalViaticos,
      efectivoRecibido: totalVentasContado + totalCobranzas - totalDepositos,
      totalResumenes: vendorResumenes.length,
      aprobados,
      pendientes,
    };
  }).filter(v => {
    if (filterVendedor === 'all') return v.totalResumenes > 0 || true;
    return v.id === filterVendedor;
  });

  // Global totals
  const totals = vendorSummary.reduce(
    (acc, v) => ({
      contado: acc.contado + v.contado,
      credito: acc.credito + v.credito,
      cobranzas: acc.cobranzas + v.cobranzas,
      adelantos: acc.adelantos + v.adelantos,
      depositos: acc.depositos + v.depositos,
      totalIngresos: acc.totalIngresos + v.totalIngresos,
      totalGastos: acc.totalGastos + v.totalGastos,
      efectivoRecibido: acc.efectivoRecibido + v.efectivoRecibido,
      totalViaticos: acc.totalViaticos + v.totalViaticos,
    }),
    { contado: 0, credito: 0, cobranzas: 0, adelantos: 0, depositos: 0, totalIngresos: 0, totalGastos: 0, efectivoRecibido: 0, totalViaticos: 0 }
  );

  // Payment method breakdown
  const paymentBreakdown = [
    { name: 'Efectivo', value: totals.efectivoRecibido > 0 ? totals.efectivoRecibido : 0, icon: Banknote },
    { name: 'Depósitos / Digital', value: totals.depositos, icon: Smartphone },
    { name: 'Crédito', value: totals.credito, icon: CreditCard },
  ];

  // Chart data for vendors
  const chartData = vendorSummary
    .filter(v => v.totalResumenes > 0)
    .map(v => ({
      name: v.nombre.split(' ')[0] || 'N/A',
      contado: v.contado,
      credito: v.credito,
      cobranzas: v.cobranzas,
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Resumen de Ventas por Vendedor</h1>
          <p className="text-muted-foreground mt-1">
            Desglose de ventas, cobranzas y métodos de pago por vendedor
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
          <Label className="text-xs text-muted-foreground mb-1 block">Vendedor</Label>
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vendedores</SelectItem>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.usuario?.nombre}</SelectItem>
              ))}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas Contado</p>
                <p className="text-lg font-bold">S/ {totals.contado.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventas Crédito</p>
                <p className="text-lg font-bold">S/ {totals.credito.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cobranzas</p>
                <p className="text-lg font-bold">S/ {totals.cobranzas.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Efectivo Total</p>
                <p className="text-lg font-bold">S/ {totals.efectivoRecibido.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        {/* Sales by Vendor Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Ventas por Vendedor
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
                  <Bar dataKey="contado" fill="hsl(var(--primary))" name="Contado" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="credito" fill="hsl(217, 91%, 60%)" name="Crédito" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="cobranzas" fill="hsl(280, 67%, 55%)" name="Cobranzas" radius={[2, 2, 0, 0]} stackId="a" />
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
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentBreakdown.filter(p => p.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
              <div className="space-y-3">
                {paymentBreakdown.map((method, i) => (
                  <div key={method.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
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

      {/* Vendor Detail Table */}
      <Card className="shadow-card animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Detalle por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Cobranzas</TableHead>
                  <TableHead className="text-right">Adelantos</TableHead>
                  <TableHead className="text-right">Dep/Digital</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Viáticos</TableHead>
                  <TableHead className="text-right">Efectivo</TableHead>
                  <TableHead className="text-right">Total Ingresos</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : vendorSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                            <p className="text-xs text-muted-foreground">{v.codigo}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{v.zona || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {v.contado.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {v.credito.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {v.cobranzas.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {v.adelantos.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                          S/ {v.depositos.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          S/ {v.totalGastos.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {v.totalViaticos.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                          S/ {v.efectivoRecibido.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          S/ {v.totalIngresos.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {v.aprobados > 0 && (
                              <Badge variant="default" className="text-xs">{v.aprobados} apr.</Badge>
                            )}
                            {v.pendientes > 0 && (
                              <Badge variant="secondary" className="text-xs">{v.pendientes} pend.</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTALES</TableCell>
                      <TableCell />
                      <TableCell className="text-right">S/ {totals.contado.toLocaleString()}</TableCell>
                      <TableCell className="text-right">S/ {totals.credito.toLocaleString()}</TableCell>
                      <TableCell className="text-right">S/ {totals.cobranzas.toLocaleString()}</TableCell>
                      <TableCell className="text-right">S/ {totals.adelantos.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">S/ {totals.depositos.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">S/ {totals.totalGastos.toLocaleString()}</TableCell>
                      <TableCell className="text-right">S/ {totals.totalViaticos.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">S/ {totals.efectivoRecibido.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-primary">S/ {totals.totalIngresos.toLocaleString()}</TableCell>
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

export default SalesByVendor;
