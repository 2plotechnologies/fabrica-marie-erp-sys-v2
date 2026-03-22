import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, FileDown, Plus,
  Search, Eye, ArrowDownCircle, ArrowUpCircle,
  Calculator, CheckCircle2, Loader2, ShieldCheck, ShieldX, ShieldAlert,
  XCircle
} from 'lucide-react';
import { resumenDiarioService } from '@/services/resumenDiarioService';
import { toast } from 'sonner';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatErrorMessage } from '@/lib/axios-error';

const DailySummaryPage = () => {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === 'VENDEDOR';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { locale: es }),
    to: endOfWeek(new Date(), { locale: es }),
  });
  const [selectedResumen, setSelectedResumen] = useState<any | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const [newGastos, setNewGastos] = useState<{ descripcion: string; categoria: string; monto: number }[]>([]);
  const [gastoTemp, setGastoTemp] = useState({ descripcion: '', categoria: 'gerencia', monto: 0 });

  const [vendedores, setVendedores] = useState<any[]>([]);
  const vendedorActual = vendedores.find(v => v.usuario_id === user?.id);
  const [rutas, setRutas] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [salidas, setSalidas] = useState<any[]>([]);
  const [resumenes, setResumenes] = useState<any[]>([]);
  const [resumenVendedor, setResumenVendedor] = useState<any | null>(null);
  const ventasDelDia = resumenVendedor?.totalVentas || 0;
  const cobranzasDelDia = resumenVendedor?.totalCobranzas || 0;
  const cajaChicaAsignada = resumenVendedor?.totalViaticos || 0;
  const adelantosDia = resumenVendedor?.totalAdelantos || 0;
  const depositosDia = resumenVendedor?.totalDepositos || 0;
  const monederoVirtualDia = resumenVendedor?.totalMonederoVirtual || 0;
  const gastosDelDia = Array.isArray(resumenVendedor?.gastos)
    ? resumenVendedor.gastos
    : Object.values(resumenVendedor?.gastos || {});
  const totalGastosBackend = gastosDelDia.reduce(
    (acc: number, g: any) => acc + Number(g?.monto || 0),
    0
  );
  const [saldo_a_entregar, setSaldo_a_entregar] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for new resumen
  const [newResumen, setNewResumen] = useState({
    fecha: new Date().toISOString().split('T')[0],
    vendedor_id: isVendedor && vendedorActual ? String(vendedorActual.id) : '',
    conductor: '',
    zona: '',
    ruta_id: '',
    vehiculo_id: '',
    salida_id: '',
    contado: 0,
    credito: 0,
    cobranza: 0,
    depositos: 0,
    viaticos: 0,
    monederoVirtual: 0,
    adelantos: 0,
    total_gastos: 0,
    saldo_a_entregar: 0,
    saldo_entregado: 0,
    diferencia: 0,

    firma: true,
    estado: 'PENDIENTE',
  });


  const handleVehiculoChange = (vehiculoId: string) => {
    const vehiculoSeleccionado = vehiculos.find(v => String(v.id) === vehiculoId);
    setNewResumen(prev => ({
      ...prev,
      vehiculo_id: vehiculoId,
      conductor: vehiculoSeleccionado?.chofer || prev.conductor,
    }));
  }

  const getResumenesDiarios = async () => {
    try {
      const response = await resumenDiarioService.getAll();
      setResumenes(response);
    } catch (error) {
      toast.error('Error al obtener los resúmenes diarios');
    } finally {
      setIsLoading(false);
    }
  }

  const getByVendedorId = async (vendedor_id: string, fecha?: string) => {
    try {
      const response = await resumenDiarioService.getAutoResumenDiario(vendedor_id, fecha);
      setResumenVendedor(response);
    } catch (error) {
      toast.error('Error al obtener el resumen diario');
    }
  }

  const getVendedores = async () => {
    try {
      const response = await resumenDiarioService.getVendedores();
      setVendedores(response);
    } catch (error) {
      toast.error('Error al obtener los vendedores');
    }
  }

  const getRutas = async () => {
    try {
      const response = await resumenDiarioService.getRutas();
      setRutas(response);
    } catch (error) {
      toast.error('Error al obtener las rutas');
    }
  }

  const getVehiculos = async () => {
    try {
      const response = await resumenDiarioService.getVehiculos();
      setVehiculos(response);
    } catch (error) {
      toast.error('Error al obtener los vehiculos');
    }
  }

  const getSalidas = async () => {
    try {
      const response = await resumenDiarioService.getSalidas();
      console.log(response);
      setSalidas(response);
    } catch (error) {
      toast.error('Error al obtener las salidas');
    }
  }

  useEffect(() => {
    getResumenesDiarios();
    getVendedores();
    getRutas();
    getVehiculos();
    getSalidas();
  }, []);

  useEffect(() => {
    if (!resumenVendedor) return;

    const totalGastosForm = totalGastosBackend || 0;

    const saldo =
      (resumenVendedor.totalVentasContado || 0) +
      (resumenVendedor.totalCobranzas || 0) +
      (resumenVendedor.totalAdelantos || 0) +
      (resumenVendedor.totalViaticos || 0) -
      totalGastosForm -
      (resumenVendedor.totalDepositos || 0) -
      (resumenVendedor.totalMonederoVirtual || 0);

    setSaldo_a_entregar(saldo);

    setNewResumen(prev => ({
      ...prev,
      contado: resumenVendedor.totalVentasContado || 0,
      credito: resumenVendedor.totalCredito || 0,
      cobranza: resumenVendedor.totalCobranzas || 0,
      viaticos: resumenVendedor.totalViaticos || 0,
      depositos: resumenVendedor.totalDepositos || 0,
      monederoVirtual: resumenVendedor.totalMonederoVirtual || 0,
      adelantos: resumenVendedor.totalAdelantos || 0,
      saldo_entregado: resumenVendedor.saldoEntregar || 0,
      saldo_a_entregar: saldo,
      diferencia: (resumenVendedor.saldoEntregar || 0) - saldo,
      total_gastos: totalGastosBackend || 0,
    }));

  }, [resumenVendedor, totalGastosBackend]);

  useEffect(() => {
    if (isVendedor && vendedorActual) {
      setNewResumen(prev => ({
        ...prev,
        vendedor_id: String(vendedorActual.id),
      }));
      getByVendedorId(String(vendedorActual.id), newResumen.fecha);
    }
  }, [isVendedor, vendedorActual]);

  // Expense verification handler
  const handleVerificarGasto = async (gastoId: string, estado: 'CONFIRMADO' | 'RECHAZADO', observacion?: string) => {
    try {
      await resumenDiarioService.updateGasto(gastoId, estado, observacion);
      toast.success('Gasto actualizado correctamente');
      getResumenesDiarios();
      setSelectedResumen(null);
    } catch (error) {
      toast.error('Error al actualizar el gasto: ' + error.response.data.message);
      if (error.response.status === 403) {
        toast.error('Usted no tiene autorización para realizar esta acción.');
      }
    }
  };

  // Filtrar resúmenes
  const filteredResumenes = (Array.isArray(resumenes) ? resumenes : []).filter(resumen => {
    const vendedorNombre = resumen.vendedor?.usuario?.nombre || '';
    const matchesSearch = vendedorNombre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredResumenes.length / itemsPerPage);

  const paginatedResumenes = filteredResumenes.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // KPIs (Solo aprobados)
  const totalContado = filteredResumenes.filter(r => r.estado === 'CONFIRMADO').reduce((acc, r) => acc + Number(r.contado), 0);
  const totalCredito = filteredResumenes.filter(r => r.estado === 'CONFIRMADO').reduce((acc, r) => acc + Number(r.credito), 0);
  const totalCobranza = filteredResumenes.filter(r => r.estado === 'CONFIRMADO').reduce((acc, r) => acc + Number(r.cobranza), 0);
  const totalGastos = filteredResumenes.filter(r => r.estado === 'CONFIRMADO').reduce((acc, r) => acc + Number(r.total_gastos), 0);
  const totalEntregado = filteredResumenes.filter(r => r.estado === 'CONFIRMADO').reduce((acc, r) => acc + Number(r.saldo_entregado), 0);
  const totalDiferencias = filteredResumenes.filter(r => r.estado === 'CONFIRMADO').reduce((acc, r) => acc + Number(r.diferencia), 0);
  const totalIngresos = totalContado + totalCobranza;

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30">PENDIENTE</Badge>;
      case 'ENVIADO':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">ENVIADO</Badge>;
      case 'CONFIRMADO':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">CONFIRMADO</Badge>;
      case 'RECHAZADO':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">RECHAZADO</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const handleAddGasto = () => {
    if (gastoTemp.descripcion && gastoTemp.monto > 0) {
      setNewGastos([...newGastos, gastoTemp]);
      setGastoTemp({ descripcion: '', categoria: 'combustible', monto: 0 });
    }
  };

  const handleCreateResumen = async () => {
    if (!newResumen.vendedor_id) return;

    try {
      await resumenDiarioService.createResumenDiario(newResumen);
      await getResumenesDiarios();
      setIsNewDialogOpen(false);
      setNewResumen({
        fecha: new Date().toISOString().split('T')[0],
        vendedor_id: '',
        conductor: '',
        zona: '',
        ruta_id: '',
        vehiculo_id: '',
        salida_id: '',
        contado: 0,
        credito: 0,
        cobranza: 0,
        depositos: 0,
        viaticos: 0,
        monederoVirtual: 0,
        total_gastos: 0,
        adelantos: 0,
        saldo_a_entregar: 0,
        saldo_entregado: 0,
        diferencia: 0,
        firma: true,
        estado: 'PENDIENTE',
      });
      setNewGastos([]);
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear resumen', error, 'No se pudo crear el resumen.'));
    }
  };

  const handleAprobar = async (id: string) => {
    try {
      await resumenDiarioService.update(id, 'CONFIRMADO', 'Resumen aprobado');
      setSelectedResumen(null);
      getResumenesDiarios();
    } catch (error) {
      toast.error('Error al aprobar el resumen: ' + error.response.data.message);
      if (error.response.status === 403) {
        toast.error('Usted no tiene autorización para realizar esta acción.');
      }
    }
  };

  const handleRechazar = async (id: string) => {
    try {
      await resumenDiarioService.update(id, 'RECHAZADO', 'Resumen rechazado');
      setSelectedResumen(null);
      getResumenesDiarios();
    } catch (error) {
      toast.error('Error al rechazar el resumen: ' + error.response.data.message);
      if (error.response.status === 403) {
        toast.error('Usted no tiene autorización para realizar esta acción.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Resumen Diario</h1>
          <p className="text-muted-foreground">Reporte diario de ingresos y egresos por vendedor</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-warm hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Resumen Diario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Resumen Diario</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={newResumen.fecha}
                      onChange={(e) => {
                        const fecha = e.target.value;
                        setNewResumen(prev => ({ ...prev, fecha }));

                        if (newResumen.vendedor_id) {
                          getByVendedorId(newResumen.vendedor_id, fecha);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendedor</Label>
                    <Select
                      value={newResumen.vendedor_id}
                      disabled={isVendedor}
                      onValueChange={(v) => {
                        setNewResumen(prev => ({ ...prev, vendedor_id: v }));
                        getByVendedorId(v, newResumen.fecha);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(vendedores) ? vendedores : []).map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.usuario.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nuevos campos: Conductor, Zona, Ruta, Salida de Fábrica */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conductor</Label>
                    {/* Reemplazar select por input text */}
                    <Input
                      type="text"
                      value={newResumen.conductor}
                      onChange={(e) => setNewResumen({ ...newResumen, conductor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Zona</Label>

                    <Select
                      value={newResumen.zona}
                      onValueChange={(v) => setNewResumen({ ...newResumen, zona: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Norte">Norte</SelectItem>
                        <SelectItem value="Sur">Sur</SelectItem>
                        <SelectItem value="Este">Este</SelectItem>
                        <SelectItem value="Oeste">Oeste</SelectItem>
                        <SelectItem value="Centro">Centro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ruta</Label>
                    {/* Cargar Rutas de la base de datos */}
                    <Select
                      value={newResumen.ruta_id}
                      onValueChange={(v) => setNewResumen({ ...newResumen, ruta_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ruta" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(rutas) ? rutas : []).map(r => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Salida de Fábrica Asociada</Label>
                    {/* Cargar Salidas de Fábrica de la base de datos */}
                    <Select
                      value={newResumen.salida_id}
                      onValueChange={(v) => setNewResumen({ ...newResumen, salida_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar salida de fábrica" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(salidas) ? salidas : []).map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.fecha} - {s.vehiculo.placa} - {s.ruta.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Vehículo</Label>
                    {/* Cargar Vehículos de la base de datos */}
                    <Select
                      value={newResumen.vehiculo_id}
                      onValueChange={handleVehiculoChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(vehiculos) ? vehiculos : []).map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.placa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-1">Ingresos</h4>
                  {resumenVendedor && (
                    <p className="text-xs text-muted-foreground mb-3">
                      ✨ Datos auto-generados desde las ventas y cobranzas del día
                      {resumenVendedor.totalVentas ? ` (${resumenVendedor.totalVentas} ventas${resumenVendedor.adelantos > 0 ? `, S/ ${Number(resumenVendedor.adelantos).toFixed(2)} en adelantos` : ''})` : ''}
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Venta Contado</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newResumen.contado || ''}
                        readOnly={!!ventasDelDia}
                        className={ventasDelDia ? 'bg-muted' : ''}
                        onChange={(e) => setNewResumen({ ...newResumen, contado: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Venta Crédito</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newResumen.credito || ''}
                        readOnly={!!ventasDelDia}
                        className={ventasDelDia ? 'bg-muted' : ''}
                        onChange={(e) => setNewResumen({ ...newResumen, credito: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cobranzas</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newResumen.cobranza || ''}
                        readOnly={cobranzasDelDia !== undefined && cobranzasDelDia > 0}
                        className={cobranzasDelDia !== undefined && cobranzasDelDia > 0 ? 'bg-muted' : ''}
                        onChange={(e) => setNewResumen({ ...newResumen, cobranza: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Adelantos Crédito</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newResumen.adelantos || ''}
                        readOnly={adelantosDia && adelantosDia > 0}
                        className={adelantosDia && adelantosDia > 0 ? 'bg-muted' : ''}
                        onChange={(e) => setNewResumen({ ...newResumen, adelantos: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Caja Chica Asignada</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    ✨ Auto-rellenado desde viáticos aprobados para esta fecha
                  </p>
                  <div className="space-y-2">
                    <Label>Caja Chica Asignada</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newResumen.viaticos || ''}
                      readOnly={cajaChicaAsignada > 0}
                      className={cajaChicaAsignada > 0 ? 'bg-muted' : ''}
                      onChange={(e) => setNewResumen({ ...newResumen, viaticos: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Gastos</h4>

                  {gastosDelDia.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay gastos registrados para este vendedor hoy.
                    </p>
                  )}

                  {gastosDelDia.length > 0 && (
                    <div className="space-y-2">
                      {gastosDelDia.map((g: any) => (
                        <div
                          key={g.id}
                          className="flex justify-between items-center p-2 bg-muted rounded"
                        >
                          <span>
                            {g.comprobante} ({g.tipo})
                          </span>

                          <span className="font-medium">
                            S/ {Number(g.monto).toFixed(2)}
                          </span>
                        </div>
                      ))}

                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Total Gastos:</span>
                        <span>S/ {totalGastosBackend.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Pagos Electrónicos */}
                <div>
                  <h4 className="font-medium mb-3">Pagos Electrónicos (Descuento del Saldo)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Depósito Bancario</Label>
                      <Input
                        type="number" placeholder="0.00"
                        value={newResumen.depositos || ''}
                        readOnly={depositosDia && depositosDia > 0}
                        className={depositosDia && depositosDia > 0 ? 'bg-muted' : ''}
                        onChange={(e) => setNewResumen({ ...newResumen, depositos: parseFloat(e.target.value) || 0 } as any)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Yape / Plin</Label>
                      <Input
                        type="number" placeholder="0.00"
                        value={newResumen.monederoVirtual || ''}
                        readOnly={monederoVirtualDia && monederoVirtualDia > 0}
                        className={monederoVirtualDia && monederoVirtualDia > 0 ? 'bg-muted' : ''}
                        onChange={(e) => setNewResumen({ ...newResumen, monederoVirtual: parseFloat(e.target.value) || 0 } as any)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Saldo Entregado Calculado */}
                <Card className="bg-muted/50 border-primary/20">
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-semibold text-sm">Saldo Entregado (Cálculo Automático)</h4>
                    <p className="text-xs text-muted-foreground">
                      = Venta Contado + Cobranzas + Adelantos + Caja Chica − Gastos − Depósito − Yape/Plin
                    </p>
                    {(() => {
                      const totalGastosForm = totalGastosBackend;
                      const saldoEntregado =
                        (newResumen.contado || 0) +
                        (newResumen.cobranza || 0) +
                        (newResumen.adelantos || 0) +
                        (newResumen.viaticos || 0) -
                        totalGastosForm -
                        (newResumen.depositos || 0) -
                        (newResumen.monederoVirtual || 0);
                      return (
                        <p className={`text-2xl font-bold ${saldoEntregado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          S/ {saldoEntregado.toFixed(2)}
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Efectivo Recibido (Real)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newResumen.saldo_entregado || ''}
                    onChange={(e) => setNewResumen({ ...newResumen, saldo_entregado: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateResumen}
                    disabled={!newResumen.vendedor_id}>
                    Guardar Resumen
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Ingresos</p>
                <p className="text-xl font-bold text-foreground">S/ {totalIngresos.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Gastos</p>
                <p className="text-xl font-bold text-foreground">S/ {totalGastos.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Entregado</p>
                <p className="text-xl font-bold text-foreground">S/ {totalEntregado.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totalDiferencias >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${totalDiferencias >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                <Calculator className={`h-5 w-5 ${totalDiferencias >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`text-xl font-bold ${totalDiferencias >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  S/ {totalDiferencias.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs detallados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Venta Contado</p>
            <p className="text-lg font-bold text-emerald-600">S/ {totalContado.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Venta Crédito</p>
            <p className="text-lg font-bold text-amber-600">S/ {totalCredito.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cobranzas</p>
            <p className="text-lg font-bold text-blue-600">S/ {totalCobranza.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Resúmenes</p>
            <p className="text-lg font-bold">{filteredResumenes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por vendedor..."
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
                {(Array.isArray(vendedores) ? vendedores : []).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.usuario?.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
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

      {/* Tabla principal */}
      <Card>
        <CardHeader>
          <CardTitle>Resúmenes Diarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Conductor</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead className="text-right">Contado</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
                <TableHead className="text-right">Cobranza</TableHead>
                <TableHead className="text-right">Gastos</TableHead>
                <TableHead className="text-right">Entregado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResumenes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                    {resumenes.length === 0 ? 'No hay resúmenes registrados' : 'No se encontraron resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResumenes.map((resumen) => (
                  <TableRow key={resumen.id}>
                    <TableCell>{format(new Date(resumen.fecha), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{resumen.vendedor?.usuario?.nombre || '-'}</TableCell>
                    <TableCell>{resumen.conductor || '-'}</TableCell>
                    <TableCell>{resumen.zona || '-'}</TableCell>
                    <TableCell>{resumen.ruta.nombre || '-'}</TableCell>
                    <TableCell className="text-right text-emerald-600">S/ {Number(resumen.contado).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-amber-600">S/ {Number(resumen.credito).toLocaleString()}</TableCell>
                    <TableCell className="text-right">S/ {Number(resumen.cobranza).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">S/ {Number(resumen.total_gastos).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">S/ {Number(resumen.saldo_entregado).toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-bold ${Number(resumen.diferencia) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(resumen.diferencia) >= 0 ? '+' : ''}{Number(resumen.diferencia).toFixed(2)}
                    </TableCell>
                    <TableCell>{getEstadoBadge(resumen.estado)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedResumen(resumen); console.log(resumen); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
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

      {/* Modal de detalle */}
      <Dialog open={!!selectedResumen} onOpenChange={() => setSelectedResumen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen de Ventas y Egresos</DialogTitle>
          </DialogHeader>

          {selectedResumen && (
            <div className="space-y-6 py-4">
              {/* Header del resumen */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{format(new Date(selectedResumen.fecha), 'PPP', { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedResumen.vendedor?.usuario?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getEstadoBadge(selectedResumen.estado)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conductor</p>
                  <p className="font-medium">{selectedResumen.conductor || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zona</p>
                  <p className="font-medium">{selectedResumen.zona || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ruta</p>
                  <p className="font-medium">{selectedResumen.ruta?.nombre || '-'}</p>
                </div>
              </div>

              {/* Ingresos y Gastos lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ingresos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                      Ingresos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venta Contado</span>
                      <span className="font-medium">S/ {Number(selectedResumen.contado).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venta Crédito</span>
                      <span className="font-medium">S/ {Number(selectedResumen.credito).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adelantos</span>
                      <span className="font-medium">S/ {Number(selectedResumen.adelanto).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cobranzas</span>
                      <span className="font-medium">S/ {Number(selectedResumen.cobranza).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Otros Ingresos</span>
                      <span className="font-medium">S/ {Number(selectedResumen.depositos).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Ingresos</span>
                      <span className="text-emerald-600">
                        S/ {(Number(selectedResumen.contado) + Number(selectedResumen.cobranza) + Number(selectedResumen.adelanto) + Number(selectedResumen.depositos)).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Gastos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-500" />
                      Gastos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedResumen.gastos && selectedResumen.gastos.length > 0 ? (
                      <>
                        {['gerencia', 'productora', 'distribuidora', 'descripcion_general'].map(cat => {
                          const gastosCategoria = (Array.isArray(selectedResumen.gastos) ? selectedResumen.gastos : []).filter(g => g.tipo === cat);
                          if (gastosCategoria.length === 0) return null;
                          const catLabels: Record<string, string> = {
                            gerencia: 'Gerencia', productora: 'Productora',
                            distribuidora: 'Distribuidora', descripcion_general: 'Descripción General',
                          };
                          return (
                            <div key={cat} className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{catLabels[cat] || cat}</p>
                              {gastosCategoria.map((gasto) => {
                                const estadoVerif = (gasto as any).estado || 'PENDIENTE';
                                return (
                                  <div key={gasto.id} className="flex justify-between items-center pl-2 gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-muted-foreground truncate">{gasto.comprobante}</span>
                                      {estadoVerif === 'CONFIRMADO' && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs shrink-0"><ShieldCheck className="h-3 w-3 mr-1" />Verificado</Badge>}
                                      {estadoVerif === 'PENDIENTE' && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs shrink-0"><ShieldAlert className="h-3 w-3 mr-1" />No Verificado</Badge>}
                                      {estadoVerif === 'RECHAZADO' && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs shrink-0"><ShieldX className="h-3 w-3 mr-1" />No Aceptado</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-medium">S/ {Number(gasto.monto).toLocaleString()}</span>
                                      {selectedResumen.estado !== 'CONFIRMADO' && estadoVerif === 'PENDIENTE' && (
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600 hover:bg-emerald-50" onClick={() => handleVerificarGasto(gasto.id, 'CONFIRMADO')}>
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => handleVerificarGasto(gasto.id, 'RECHAZADO')}>
                                            <ShieldX className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        {/* Show legacy categories */}
                        {(Array.isArray(selectedResumen.gastos) ? selectedResumen.gastos : [])
                          .filter(g => !['gerencia', 'productora', 'distribuidora', 'descripcion_general'].includes(g.categoria))
                          .map((gasto) => {
                            const estadoVerif = (gasto as any).estado_verificacion || 'PENDIENTE';
                            return (
                              <div key={gasto.id} className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-muted-foreground truncate">{gasto.descripcion}</span>
                                  <Badge variant="outline" className="text-xs">{gasto.categoria}</Badge>
                                  {estadoVerif === 'CONFIRMADO' && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Verificado</Badge>}
                                  {estadoVerif === 'PENDIENTE' && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs"><ShieldAlert className="h-3 w-3 mr-1" />No Verificado</Badge>}
                                  {estadoVerif === 'RECHAZADO' && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs"><ShieldX className="h-3 w-3 mr-1" />No Aceptado</Badge>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-medium">S/ {Number(gasto.monto).toLocaleString()}</span>
                                  {selectedResumen.estado !== 'CONFIRMADO' && estadoVerif === 'PENDIENTE' && (
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600 hover:bg-emerald-50" onClick={() => handleVerificarGasto(gasto.id, 'CONFIRMADO')}>
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => handleVerificarGasto(gasto.id, 'RECHAZADO')}>
                                        <ShieldX className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        }
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">Sin gastos registrados</p>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Gastos</span>
                      <span className="text-red-600">S/ {Number(selectedResumen.total_gastos).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Saldo Entregado Automatizado */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Saldo Entregado (Cálculo Automático)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    = Venta Contado + Cobranzas + Adelantos + Viáticos − Gastos − Pagos Electrónicos
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(+) Venta Contado</span>
                      <span className="font-medium text-emerald-600">S/ {Number(selectedResumen.contado).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(+) Cobranzas</span>
                      <span className="font-medium text-emerald-600">S/ {Number(selectedResumen.cobranza).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(+) Adelantos</span>
                      <span className="font-medium text-emerald-600">S/ {Number(selectedResumen.adelanto).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(+) Viáticos</span>
                      <span className="font-medium text-emerald-600">S/ {Number(selectedResumen.viaticos).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(−) Gastos</span>
                      <span className="font-medium text-red-600">S/ {Number(selectedResumen.total_gastos).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(−) Depósitos</span>
                      <span className="font-medium text-red-600">S/ {Number(selectedResumen.depositos).toLocaleString()}</span>
                    </div>
                  </div>
                  <Separator />
                  {(() => {
                    const saldoCalculado =
                      Number(selectedResumen.contado) +
                      Number(selectedResumen.cobranza) +
                      Number(selectedResumen.adelanto) +
                      Number(selectedResumen.viaticos) -
                      Number(selectedResumen.total_gastos) -
                      Number(selectedResumen.depositos);
                    return (
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Saldo Entregado Esperado</span>
                        <span className={`text-2xl font-bold ${saldoCalculado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          S/ {saldoCalculado.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Resumen final */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Saldo Esperado</p>
                      <p className="text-2xl font-bold">
                        S/ {(Number(selectedResumen.contado) + Number(selectedResumen.cobranza) + Number(selectedResumen.adelanto) + Number(selectedResumen.viaticos) - Number(selectedResumen.total_gastos) - Number(selectedResumen.depositos)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Efectivo Recibido</p>
                      <p className="text-2xl font-bold text-blue-600">S/ {Number(selectedResumen.saldo_entregado).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Diferencia</p>
                      <p className={`text-2xl font-bold ${Number(selectedResumen.diferencia) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {Number(selectedResumen.diferencia) >= 0 ? '+' : ''}S/ {Number(selectedResumen.diferencia).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedResumen.estado === 'CONFIRMADO' && (
                    <div className="mt-6 pt-4 border-t flex items-center justify-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span>Confirmado y verificado</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botón de aprobar */}
              {selectedResumen.estado !== 'CONFIRMADO' && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedResumen(null)}>
                    Cerrar
                  </Button>
                  {selectedResumen.estado === 'PENDIENTE' && (
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => handleRechazar(selectedResumen.id)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar Resumen
                    </Button>
                  )}
                  {selectedResumen.estado === 'PENDIENTE' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAprobar(selectedResumen.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar Resumen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailySummaryPage;
