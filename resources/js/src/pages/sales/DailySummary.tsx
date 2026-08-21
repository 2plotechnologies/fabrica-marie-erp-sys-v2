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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, FileDown, Plus,
  Search, Eye, ArrowDownCircle, ArrowUpCircle,
  Calculator, CheckCircle2, Loader2, ShieldCheck, ShieldX, ShieldAlert,
  XCircle, Truck, MapPin, Layers, RefreshCw, ChevronRight, Fuel, AlertTriangle
} from 'lucide-react';
import { resumenDiarioService } from '@/services/resumenDiarioService';
import { mapaInteractivoService } from '@/services/mapaInteractivoService';
import { toast } from 'sonner';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatErrorMessage } from '@/lib/axios-error';

const renderStockAuditTable = (stockAuditData: any) => {
  if (!stockAuditData) return null;

  const diasList: any[] = Array.isArray(stockAuditData?.dias) ? stockAuditData.dias : [];
  const itemsList: any[] = Array.isArray(stockAuditData?.items)
    ? stockAuditData.items
    : (Array.isArray(stockAuditData) ? stockAuditData : []);

  if (itemsList.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-1">
        No hay información de stock de salida registrada para esta fecha/vendedor.
      </p>
    );
  }

  const hasMultipleDays = diasList.length > 1;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto border rounded-lg">
      <Table className="w-full min-w-[500px]">
        <TableHeader>
          <TableRow className="bg-muted/50 text-xs">
            <TableHead className="min-w-[120px] whitespace-nowrap">Producto</TableHead>
            <TableHead className="text-right whitespace-nowrap">Stock Asignado</TableHead>
            {diasList.length > 0 ? (
              diasList.map((d: any) => (
                <TableHead key={d.numero} className="text-right whitespace-nowrap">
                  Vendido {d.etiqueta} {d.fecha_formateada ? `(${d.fecha_formateada})` : ''}
                </TableHead>
              ))
            ) : (
              <TableHead className="text-right whitespace-nowrap">Stock Vendido</TableHead>
            )}
            {hasMultipleDays && (
              <TableHead className="text-right whitespace-nowrap font-bold">Total Vendido</TableHead>
            )}
            <TableHead className="text-right whitespace-nowrap font-bold text-amber-700 dark:text-amber-500">Devueltos</TableHead>
            <TableHead className="text-right whitespace-nowrap font-bold">Sobrantes / Disponible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itemsList.map((stItem: any, i: number) => {
            const ventasDias = stItem.ventas_dias || {};
            const stockAsignado = Number(stItem.stock_asignado || 0);
            const totalVendido = Number(stItem.total_vendido ?? stItem.stock_vendido ?? 0);
            const sobrante = Number(stItem.sobrante || 0);

            return (
              <TableRow key={stItem.producto_id || i} className="text-xs">
                <TableCell className="font-medium max-w-[160px] truncate">
                  {stItem.producto}
                  {stItem.codigo && <span className="text-muted-foreground text-[10px] block truncate">{stItem.codigo}</span>}
                </TableCell>
                <TableCell className="text-right font-semibold text-blue-600 whitespace-nowrap">
                  {stockAsignado}
                </TableCell>
                {diasList.length > 0 ? (
                  diasList.map((d: any) => {
                    const cantDia = Number(ventasDias[d.etiqueta] || 0);
                    return (
                      <TableCell key={d.numero} className={`text-right font-semibold whitespace-nowrap ${cantDia > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {cantDia}
                      </TableCell>
                    );
                  })
                ) : (
                  <TableCell className="text-right font-semibold text-emerald-600 whitespace-nowrap">
                    {totalVendido}
                  </TableCell>
                )}
                {hasMultipleDays && (
                  <TableCell className="text-right font-bold text-emerald-700 whitespace-nowrap">
                    {totalVendido}
                  </TableCell>
                )}
                <TableCell className="text-right font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
                  {stItem.total_devuelto || 0}
                </TableCell>
                <TableCell className="text-right font-bold whitespace-nowrap">
                  {sobrante > 0 ? (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 whitespace-nowrap">
                      {sobrante} disponible(s)
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const DailySummaryPage = () => {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === 'VENDEDOR';
  const [activeTab, setActiveTab] = useState<'diario' | 'acumulado'>('diario');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { locale: es }),
    to: endOfWeek(new Date(), { locale: es }),
  });
  const [selectedResumen, setSelectedResumen] = useState<any | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  // Acumulado Salidas State
  const [acumuladoSalidas, setAcumuladoSalidas] = useState<any[]>([]);
  const [isAcumuladoLoading, setIsAcumuladoLoading] = useState(false);
  const [filterSalidaVendedor, setFilterSalidaVendedor] = useState<string>('all');
  const [filterSalidaEstado, setFilterSalidaEstado] = useState<string>('all');
  const [searchSalidaTerm, setSearchSalidaTerm] = useState('');
  const [selectedSalidaDetalle, setSelectedSalidaDetalle] = useState<any | null>(null);

  const [newGastos, setNewGastos] = useState<{ descripcion: string; categoria: string; monto: number }[]>([]);
  const [gastoTemp, setGastoTemp] = useState({ descripcion: '', categoria: 'gerencia', monto: 0 });

  const [vendedores, setVendedores] = useState<any[]>([]);
  const vendedorActual = vendedores.find(v => v.usuario_id === user?.id);
  const [rutas, setRutas] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [salidas, setSalidas] = useState<any[]>([]);
  const [resumenes, setResumenes] = useState<any[]>([]);
  const [zonasList, setZonasList] = useState<any[]>([]);
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
    fecha: format(new Date(), 'yyyy-MM-dd'),
    vendedor_id: isVendedor && vendedorActual ? String(vendedorActual.id) : '',
    conductor: '',
    zona: '',
    ruta_id: '',
    ruta_ids: [] as number[],
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
    if (vehiculoId === 'sin_vehiculo') {
      setNewResumen(prev => ({
        ...prev,
        vehiculo_id: vehiculoId,
      }));
      return;
    }
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

  const handleZonaChange = (newZona: string) => {
    const validRutas = (Array.isArray(rutas) ? rutas : [])
      .filter(r => r.zona === newZona && (newResumen.ruta_ids || []).includes(r.id))
      .map(r => r.id);
    setNewResumen(prev => ({
      ...prev,
      zona: newZona,
      ruta_ids: validRutas,
    }));
  };

  const handleAddRuta = (rutaIdStr: string) => {
    const rutaId = Number(rutaIdStr);
    if (!rutaId || (newResumen.ruta_ids || []).includes(rutaId)) return;

    const selectedRuta = (Array.isArray(rutas) ? rutas : []).find(r => r.id === rutaId);
    const newZona = selectedRuta?.zona || newResumen.zona;

    const existingValid = (newResumen.ruta_ids || []).filter(id => {
      const r = (Array.isArray(rutas) ? rutas : []).find(x => x.id === id);
      return !newZona || r?.zona === newZona;
    });

    setNewResumen(prev => ({
      ...prev,
      zona: newZona,
      ruta_ids: [...existingValid, rutaId]
    }));
  };

  const handleRemoveRuta = (rutaId: number) => {
    setNewResumen(prev => ({
      ...prev,
      ruta_ids: (prev.ruta_ids || []).filter(id => id !== rutaId)
    }));
  };

  const renderRutasText = (resumen: any) => {
    if (resumen?.rutas && resumen.rutas.length > 0) {
      return resumen.rutas.map((r: any) => r.nombre).join(', ');
    }
    return resumen?.ruta?.nombre || null;
  };

  const handleSalidaChange = (salidaIdVal: string) => {
    if (salidaIdVal === 'sin_salida' || salidaIdVal === '0') {
      setNewResumen(prev => ({ ...prev, salida_id: salidaIdVal }));
      return;
    }
    const sObj = (Array.isArray(salidas) ? salidas : []).find(s => String(s.id) === salidaIdVal);
    const salidaRutaIds = (sObj?.rutas && sObj.rutas.length > 0)
      ? sObj.rutas.map((r: any) => Number(r.id))
      : (sObj?.ruta_id ? [Number(sObj.ruta_id)] : []);

    setNewResumen(prev => ({
      ...prev,
      salida_id: salidaIdVal,
      ruta_ids: salidaRutaIds.length > 0 ? salidaRutaIds : prev.ruta_ids,
      vehiculo_id: sObj?.vehiculo_id ? String(sObj.vehiculo_id) : prev.vehiculo_id,
      conductor: sObj?.conductor || prev.conductor,
      zona: sObj?.zona || prev.zona,
    }));
  };

  const getByVendedorId = async (vendedor_id: string, fecha?: string) => {
    try {
      const response = await resumenDiarioService.getAutoResumenDiario(vendedor_id, fecha);
      setResumenVendedor(response);

      if (response?.salida_id) {
        const salidaRutaIds = (response.salida?.rutas && response.salida.rutas.length > 0)
          ? response.salida.rutas.map((r: any) => Number(r.id))
          : (response.salida?.ruta_id ? [Number(response.salida.ruta_id)] : []);

        setNewResumen(prev => ({
          ...prev,
          salida_id: String(response.salida_id),
          ruta_id: response.salida?.ruta_id ? String(response.salida.ruta_id) : prev.ruta_id,
          ruta_ids: salidaRutaIds.length > 0 ? salidaRutaIds : prev.ruta_ids,
          vehiculo_id: response.salida?.vehiculo_id ? String(response.salida.vehiculo_id) : prev.vehiculo_id,
          conductor: response.salida?.conductor || prev.conductor,
          zona: response.salida?.zona || prev.zona,
        }));
      } else {
        setNewResumen(prev => ({
          ...prev,
          salida_id: 'sin_salida'
        }));
      }

      getSalidas(vendedor_id, fecha);
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

  const getSalidas = async (vendedor_id?: string, fecha?: string) => {
    try {
      const response = await resumenDiarioService.getSalidas(vendedor_id, fecha);
      setSalidas(response);
    } catch (error) {
      toast.error('Error al obtener las salidas');
    }
  }

  const getZonas = async () => {
    try {
      const response = await mapaInteractivoService.getZonas();
      setZonasList(response);
    } catch (error) {
      toast.error('Error al obtener las zonas');
    }
  };

  const getAcumuladoSalidas = async () => {
    setIsAcumuladoLoading(true);
    try {
      const response = await resumenDiarioService.getResumenAcumuladoSalidas();
      setAcumuladoSalidas(response || []);
    } catch (error) {
      toast.error('Error al obtener el resumen acumulado por salida');
    } finally {
      setIsAcumuladoLoading(false);
    }
  };

  useEffect(() => {
    getResumenesDiarios();
    getVendedores();
    getRutas();
    getVehiculos();
    getSalidas();
    getZonas();
    getAcumuladoSalidas();
  }, []);

  useEffect(() => {
    if (!resumenVendedor) return;

    const totalGastosForm = totalGastosBackend || 0;
    const totalEntregasMoneyDelivery = resumenVendedor.totalEntregasDinero || 0;

    let saldo =
      (resumenVendedor.totalVentasContado || 0) +
      (resumenVendedor.totalCobranzas || 0) +
      (resumenVendedor.totalAdelantos || 0) +
      (resumenVendedor.totalViaticos || 0) -
      totalGastosForm -
      (resumenVendedor.totalDepositos || 0) -
      (resumenVendedor.totalMonederoVirtual || 0) -
      totalEntregasMoneyDelivery;

    if (saldo < 0) saldo = 0;

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
    const conductor = resumen.conductor || '';
    const zona = resumen.zona || '';
    const matchesSearch =
      vendedorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conductor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zona.toLowerCase().includes(searchTerm.toLowerCase());
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
      case 'ANULADO':
        return <Badge variant="outline" className="bg-slate-800/10 text-slate-800 border-slate-800/30 dark:bg-slate-400/10 dark:text-slate-400 dark:border-slate-400/30">ANULADO</Badge>;
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
      const totalEntregasMoneyDelivery = resumenVendedor?.totalEntregasDinero || 0;
      const payload = {
        ...newResumen,
        depositos: (newResumen.depositos || 0) + totalEntregasMoneyDelivery,
        ruta_id: (newResumen.ruta_ids && newResumen.ruta_ids.length > 0) ? newResumen.ruta_ids[0] : ((!newResumen.ruta_id || newResumen.ruta_id === 'sin_ruta') ? null : newResumen.ruta_id),
        ruta_ids: (newResumen.ruta_ids && newResumen.ruta_ids.length > 0) ? newResumen.ruta_ids : undefined,
        vehiculo_id: (!newResumen.vehiculo_id || newResumen.vehiculo_id === 'sin_vehiculo') ? null : newResumen.vehiculo_id,
        salida_id: (!newResumen.salida_id || newResumen.salida_id === 'sin_salida') ? null : newResumen.salida_id,
        conductor: !newResumen.conductor ? null : newResumen.conductor,
        zona: !newResumen.zona ? null : newResumen.zona,
      };
      await resumenDiarioService.createResumenDiario(payload);
      await getResumenesDiarios();
      setIsNewDialogOpen(false);
      setNewResumen({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        vendedor_id: '',
        conductor: '',
        zona: '',
        ruta_id: '',
        ruta_ids: [],
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

  const handleAnular = async (id: string) => {
    if (!window.confirm('¿Está seguro de anular este resumen confirmado? Sus gastos asociados también serán invalidados y los montos dejarán de ser contabilizados.')) return;
    try {
      await resumenDiarioService.update(id, 'ANULADO', 'Resumen anulado por el administrador');
      setSelectedResumen(null);
      getResumenesDiarios();
    } catch (error) {
      toast.error('Error al anular el resumen: ' + (error.response?.data?.message || ''));
      if (error.response?.status === 403) {
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
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Resumen Diario</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Reporte diario de ingresos y egresos por vendedor</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto h-9">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="default" className="w-full sm:w-auto h-11 sm:h-9 text-sm font-semibold bg-gradient-warm hover:opacity-90 shadow-md flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Resumen Diario
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl md:max-w-4xl max-h-[92vh] p-3 sm:p-6 overflow-y-auto overflow-x-hidden rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Crear Resumen Diario</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 min-w-0 w-full max-w-full overflow-x-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Conductor</Label>
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
                      onValueChange={handleZonaChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {zonasList.map(z => (
                          <SelectItem key={z.id} value={z.nombre}>
                            {z.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Rutas</Label>
                    <Select value="" onValueChange={handleAddRuta}>
                      <SelectTrigger>
                        <SelectValue placeholder={(newResumen.ruta_ids || []).length > 0 ? "Agregar otra ruta..." : "Seleccionar ruta(s)..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(rutas) ? rutas : [])
                          .filter(r => !newResumen.zona || r.zona === newResumen.zona)
                          .filter(r => !(newResumen.ruta_ids || []).includes(r.id))
                          .map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.nombre} {r.zona ? `(${r.zona})` : ''}
                            </SelectItem>
                          ))}
                        {(Array.isArray(rutas) ? rutas : []).filter(r => (!newResumen.zona || r.zona === newResumen.zona) && !(newResumen.ruta_ids || []).includes(r.id)).length === 0 && (
                          <SelectItem value="none" disabled>
                            {newResumen.zona ? "No hay más rutas en esta zona" : "No hay rutas disponibles"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Salida de Fábrica Asociada</Label>
                    <Select
                      value={newResumen.salida_id || undefined}
                      onValueChange={handleSalidaChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar salida de fábrica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_salida">Sin Salida</SelectItem>
                        {(Array.isArray(salidas) ? salidas : []).map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            #{s.id} - {s.fecha} - {s.vehiculo?.placa || 'Sin vehículo'} - {(s.rutas && s.rutas.length > 0) ? s.rutas.map((r: any) => r.nombre).join(', ') : (s.ruta?.nombre || 'Sin Ruta')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label>Vehículo</Label>
                    <Select
                      value={newResumen.vehiculo_id || undefined}
                      onValueChange={handleVehiculoChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_vehiculo">Sin Vehículo</SelectItem>
                        {(Array.isArray(vehiculos) ? vehiculos : []).map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.placa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(newResumen.ruta_ids || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground flex items-center mr-1">Rutas seleccionadas:</span>
                    {(newResumen.ruta_ids || []).map(id => {
                      const rObj = (Array.isArray(rutas) ? rutas : []).find(r => r.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 bg-primary/10 text-primary border-primary/20">
                          {rObj?.nombre || `Ruta #${id}`}
                          <button
                            type="button"
                            onClick={() => handleRemoveRuta(id)}
                            className="hover:text-red-500 font-bold ml-1"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="font-medium mb-1">Ingresos</h4>
                  {resumenVendedor && (
                    <p className="text-xs text-muted-foreground mb-3">
                      ✨ Datos auto-generados desde las ventas y cobranzas del día
                      {resumenVendedor.totalVentas ? ` (${resumenVendedor.totalVentas} ventas${resumenVendedor.adelantos > 0 ? `, S/ ${Number(resumenVendedor.adelantos).toFixed(2)} en adelantos` : ''})` : ''}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

                {/* Auditoría de Stock de la Salida (Oculto si es Sin Salida) */}
                {Boolean(newResumen.salida_id && newResumen.salida_id !== 'sin_salida' && newResumen.salida_id !== '0') && (
                  <>
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" />
                        Auditoría de Stock de la Salida
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Desglose del stock asignado en fábrica, stock vendido por día y sobrantes
                      </p>
                      {renderStockAuditTable(resumenVendedor?.stockAudit)}
                    </div>
                    <Separator />
                  </>
                )}

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
                            {g.comprobante || g.descripcion} ({g.tipo || g.categoria})
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

                {/* Entregas de Dinero Aprobadas desde MoneyDelivery */}
                {Boolean(resumenVendedor?.totalEntregasDinero && resumenVendedor.totalEntregasDinero > 0) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Entregas de Dinero Aprobadas (MoneyDelivery)
                      </h4>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-2">
                        <div className="flex justify-between items-center font-semibold text-emerald-800 dark:text-emerald-300">
                          <span>Total Entregado / Depositado (Aprobado):</span>
                          <span className="text-sm font-bold text-emerald-600">
                            - S/ {Number(resumenVendedor.totalEntregasDinero).toFixed(2)}
                          </span>
                        </div>
                        {Array.isArray(resumenVendedor.entregasDinero) && resumenVendedor.entregasDinero.map((e: any) => (
                          <div key={e.id} className="flex justify-between items-center text-muted-foreground pt-1 border-t border-emerald-500/10">
                            <span>Entrega #{e.id} {e.nombre_receptor ? `(Receptor: ${e.nombre_receptor})` : ''}</span>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              S/ {Number(e.monto_total).toFixed(2)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Saldo Entregado Calculado */}
                <Card className="bg-muted/50 border-primary/20">
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-semibold text-sm">Saldo Entregado (Cálculo Automático)</h4>
                    <p className="text-xs text-muted-foreground">
                      = Venta Contado + Cobranzas + Adelantos + Caja Chica − Gastos − Depósitos − Yape/Plin {resumenVendedor?.totalEntregasDinero > 0 ? `− MoneyDelivery Aprobado (S/ ${Number(resumenVendedor.totalEntregasDinero).toFixed(2)})` : ''}
                    </p>
                    {(() => {
                      const totalGastosForm = totalGastosBackend;
                      const totalEntregasMoneyDelivery = resumenVendedor?.totalEntregasDinero || 0;
                      let saldoEntregadoCalculado =
                        (newResumen.contado || 0) +
                        (newResumen.cobranza || 0) +
                        (newResumen.adelantos || 0) +
                        (newResumen.viaticos || 0) -
                        totalGastosForm -
                        (newResumen.depositos || 0) -
                        (newResumen.monederoVirtual || 0) -
                        totalEntregasMoneyDelivery;

                      if (saldoEntregadoCalculado < 0) saldoEntregadoCalculado = 0;

                      return (
                        <p className={`text-2xl font-bold ${saldoEntregadoCalculado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          S/ {saldoEntregadoCalculado.toFixed(2)}
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
                    min="0"
                    value={newResumen.saldo_entregado === 0 ? '0' : newResumen.saldo_entregado || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setNewResumen({ ...newResumen, saldo_entregado: val < 0 ? 0 : val });
                    }}
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

      {/* Filtered acumulado salidas calculations */}
      {(() => {
        const filteredAcumuladoSalidas = acumuladoSalidas.filter(item => {
          const s = item.salida;
          const vendedorNombre = s?.vendedor?.usuario?.nombre || '';
          const conductor = s?.conductor || '';
          const zona = s?.zona || '';
          const vehiculo = s?.vehiculo?.placa || '';
          const matchesSearch =
            vendedorNombre.toLowerCase().includes(searchSalidaTerm.toLowerCase()) ||
            conductor.toLowerCase().includes(searchSalidaTerm.toLowerCase()) ||
            zona.toLowerCase().includes(searchSalidaTerm.toLowerCase()) ||
            vehiculo.toLowerCase().includes(searchSalidaTerm.toLowerCase()) ||
            String(s?.id).includes(searchSalidaTerm);

          const matchesVendedor = filterSalidaVendedor === 'all' || String(s?.vendedor_id) === String(filterSalidaVendedor);
          const matchesEstado = filterSalidaEstado === 'all' || s?.estado === filterSalidaEstado;

          return matchesSearch && matchesVendedor && matchesEstado;
        });

        const totalContadoAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalContado || 0), 0);
        const totalCreditoAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalCredito || 0), 0);
        const totalCobranzaAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalCobranza || 0), 0);
        const totalAdelantoAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalAdelanto || 0), 0);
        const totalDepositosAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalDepositos || 0), 0);
        const totalViaticosAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalViaticos || 0), 0);
        const totalGastosAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.totalGastos || 0), 0);
        const totalSaldoEntregarAcumulado = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.saldoAcumuladoEntregar || 0), 0);
        const totalDiferenciaAcumulada = filteredAcumuladoSalidas.reduce((acc, item) => acc + (item.totales?.diferenciaAcumulada || 0), 0);

        return (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 max-w-md bg-muted p-1 rounded-xl h-auto sm:h-10 gap-1 sm:gap-0">
              <TabsTrigger value="diario" className="flex items-center justify-center gap-2 font-medium py-2 text-xs sm:text-sm">
                <CalendarIcon className="h-4 w-4" />
                Resumen Diario
              </TabsTrigger>
              <TabsTrigger value="acumulado" className="flex items-center justify-center gap-2 font-medium py-2 text-xs sm:text-sm">
                <Truck className="h-4 w-4" />
                Resumen Acumulado por Salida
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: RESUMEN DIARIO */}
            <TabsContent value="diario" className="space-y-6">
              {/* KPIs principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Total Ingresos</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">S/ {totalIngresos.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Total Gastos</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">S/ {totalGastos.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Calculator className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Total Entregado</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">S/ {totalEntregado.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${totalDiferencias >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${totalDiferencias >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <Calculator className={`h-5 w-5 ${totalDiferencias >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Diferencia</p>
                        <p className={`text-lg sm:text-xl font-bold truncate ${totalDiferencias >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          S/ {totalDiferencias.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KPIs detallados */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                    <div className={`relative ${isVendedor ? 'xl:col-span-3' : 'xl:col-span-2'}`}>
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={isVendedor ? "Buscar por conductor o zona..." : "Buscar por vendedor, conductor o zona..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {!isVendedor && (
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
                    )}

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
                        <SelectItem value="ANULADO">Anulado</SelectItem>
                      </SelectContent>
                    </Select>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal min-w-0 w-full">
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">{format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM')}</span>
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
                <CardHeader className="px-4 py-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">Resúmenes Diarios</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  {/* Mobile Card View */}
                  <div className="space-y-3 sm:hidden">
                    {filteredResumenes.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {resumenes.length === 0 ? 'No hay resúmenes registrados' : 'No se encontraron resultados'}
                      </div>
                    ) : (
                      paginatedResumenes.map((resumen) => (
                        <div key={resumen.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-foreground truncate">{resumen.vendedor?.usuario?.nombre || '-'}</span>
                            {getEstadoBadge(resumen.estado)}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                            <div>📅 <strong className="text-foreground">{format(new Date(resumen.fecha.substring(0, 10) + 'T00:00:00'), 'dd/MM/yyyy')}</strong></div>
                            <div className="truncate">🗺️ <strong className="text-foreground truncate">{renderRutasText(resumen) || '-'}</strong></div>
                            {resumen.conductor && <div className="truncate">👤 <strong className="text-foreground truncate">{resumen.conductor}</strong></div>}
                            {resumen.zona && <div className="truncate">📍 <strong className="text-foreground truncate">{resumen.zona}</strong></div>}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-border/50 text-center">
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <span className="text-[10px] text-muted-foreground block">Contado</span>
                              <span className="font-bold text-emerald-600">S/ {Number(resumen.contado).toLocaleString()}</span>
                            </div>
                            <div className="bg-muted/40 p-1.5 rounded border">
                              <span className="text-[10px] text-muted-foreground block">Entregado</span>
                              <span className="font-bold text-foreground">S/ {Number(resumen.saldo_entregado).toLocaleString()}</span>
                            </div>
                            <div className={`p-1.5 rounded border ${Number(resumen.diferencia) >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200' : 'bg-red-50 dark:bg-red-950/30 border-red-200'}`}>
                              <span className="text-[10px] text-muted-foreground block">Diferencia</span>
                              <span className={`font-bold ${Number(resumen.diferencia) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Number(resumen.diferencia) >= 0 ? '+' : ''}{Number(resumen.diferencia).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs font-medium gap-1.5" onClick={() => setSelectedResumen(resumen)}>
                              <Eye className="h-3.5 w-3.5" /> Ver Detalle Completo
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
                          <TableHead className="whitespace-nowrap">Fecha</TableHead>
                          <TableHead className="whitespace-nowrap">Vendedor</TableHead>
                          <TableHead className="whitespace-nowrap">Conductor</TableHead>
                          <TableHead className="whitespace-nowrap">Zona</TableHead>
                          <TableHead className="whitespace-nowrap">Ruta</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Contado</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Crédito</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Cobranza</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Gastos</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Entregado</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Diferencia</TableHead>
                          <TableHead className="whitespace-nowrap">Estado</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
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
                              <TableCell className="whitespace-nowrap">{format(new Date(resumen.fecha.substring(0, 10) + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{resumen.vendedor?.usuario?.nombre || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{resumen.conductor || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{resumen.zona || '-'}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{renderRutasText(resumen) || '-'}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium whitespace-nowrap">S/ {Number(resumen.contado).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-amber-600 font-medium whitespace-nowrap">S/ {Number(resumen.credito).toLocaleString()}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">S/ {Number(resumen.cobranza).toLocaleString()}</TableCell>
                              <TableCell className="text-right text-red-600 font-medium whitespace-nowrap">S/ {Number(resumen.total_gastos).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-bold whitespace-nowrap">S/ {Number(resumen.saldo_entregado).toLocaleString()}</TableCell>
                              <TableCell className={`text-right font-bold whitespace-nowrap ${Number(resumen.diferencia) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Number(resumen.diferencia) >= 0 ? '+' : ''}{Number(resumen.diferencia).toFixed(2)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getEstadoBadge(resumen.estado)}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedResumen(resumen); console.log(resumen); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
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
            </TabsContent>

            {/* TAB 2: RESUMEN ACUMULADO POR SALIDA */}
            <TabsContent value="acumulado" className="space-y-6">
              {/* KPIs Globales Acumulados */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Truck className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Salidas / Viajes</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">{filteredAcumuladoSalidas.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Ingresos Acumulados</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">S/ {(totalContadoAcumulado + totalCobranzaAcumulado + totalAdelantoAcumulado + totalDepositosAcumulado).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 border-sky-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                        <ArrowDownCircle className="h-5 w-5 text-sky-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Yape / Plin / Depósitos</p>
                        <p className="text-lg sm:text-xl font-bold text-sky-600 truncate">S/ {totalDepositosAcumulado.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Gastos Acumulados</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">S/ {totalGastosAcumulado.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${totalDiferenciaAcumulada >= 0 ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${totalDiferenciaAcumulada >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        <Calculator className={`h-5 w-5 ${totalDiferenciaAcumulada >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Saldo Esperado Retorno</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground truncate">S/ {totalSaldoEntregarAcumulado.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filtros para Tab Acumulado */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por Salida #, vendedor, conductor, vehiculo, zona..."
                        value={searchSalidaTerm}
                        onChange={(e) => setSearchSalidaTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {!isVendedor && (
                      <Select value={filterSalidaVendedor} onValueChange={setFilterSalidaVendedor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los vendedores</SelectItem>
                          {(Array.isArray(vendedores) ? vendedores : []).map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.usuario?.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={filterSalidaEstado} onValueChange={setFilterSalidaEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado de Viaje" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="EN RUTA">En Ruta</SelectItem>
                        <SelectItem value="VENTAS DE FÁBRICA">Ventas de Fábrica (Sin Salida)</SelectItem>
                        <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="ANULADO">Anulado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Salidas Acumuladas */}
              {isAcumuladoLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredAcumuladoSalidas.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No se encontraron salidas acumuladas</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredAcumuladoSalidas.map((item) => {
                    const s = item.salida;
                    const tot = item.totales;
                    const resumenesList = item.resumenes || [];
                    const viaticosList = item.viaticos || [];
                    const isSinSalida = !s.id || s.id === 0;

                    return (
                      <Card key={isSinSalida ? `sin-salida-${s.vendedor_id}` : s.id} className="overflow-hidden border border-muted hover:border-primary/30 transition-all">
                        <CardHeader className="bg-muted/30 pb-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={`text-base font-bold px-3 py-1 ${isSinSalida ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-background'}`}>
                                {isSinSalida ? 'Ventas de Fábrica' : `Salida #${s.id}`}
                              </Badge>
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <span>{s.vendedor?.usuario?.nombre || 'Vendedor sin asignar'}</span>
                                  <Badge variant={s.estado === 'EN RUTA' ? 'default' : isSinSalida ? 'outline' : 'secondary'}>
                                    {s.estado}
                                  </Badge>
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-4">
                                  <span>📅 Fecha: <strong>{format(new Date((s.fecha || '').substring(0, 10) + 'T00:00:00'), 'dd/MM/yyyy')}</strong></span>
                                  {s.vehiculo?.placa && <span>🚚 Vehículo: <strong>{s.vehiculo.placa}</strong></span>}
                                  {s.conductor && <span>👤 Conductor: <strong>{s.conductor}</strong></span>}
                                  {s.ruta?.nombre && <span>🗺️ Ruta: <strong>{s.ruta.nombre}</strong></span>}
                                  {s.zona && <span>📍 Zona: <strong>{s.zona}</strong></span>}
                                  <span>🗓️ Reportes: <strong>{tot.cantDias} día(s)</strong></span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Saldo Final Acumulado a Entregar</p>
                              <p className="text-2xl font-bold text-emerald-600">S/ {Number(tot.saldoAcumuladoEntregar || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-4">
                          {/* KPIs Resumen Rápido del Viaje */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 sm:gap-3 mb-4 p-3 bg-muted/20 rounded-lg text-xs">
                            <div>
                              <span className="text-muted-foreground block">Contado</span>
                              <span className="font-bold text-emerald-600 text-sm">S/ {Number(tot.totalContado || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Crédito</span>
                              <span className="font-bold text-amber-600 text-sm">S/ {Number(tot.totalCredito || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Adelantos</span>
                              <span className="font-bold text-purple-600 text-sm">S/ {Number(tot.totalAdelanto || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Cobranzas</span>
                              <span className="font-bold text-blue-600 text-sm">S/ {Number(tot.totalCobranza || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Yape/Plin/Depó.</span>
                              <span className="font-bold text-sky-600 text-sm">S/ {Number(tot.totalDepositos || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Viáticos Viaje</span>
                              <span className="font-bold text-indigo-600 text-sm">S/ {Number(tot.totalViaticos || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Gastos Viaje</span>
                              <span className="font-bold text-red-600 text-sm">S/ {Number(tot.totalGastos || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Entregado Real</span>
                              <span className="font-bold text-foreground text-sm">S/ {Number(tot.totalEntregado || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Diferencia</span>
                              <span className={`font-bold text-sm ${tot.diferenciaAcumulada >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {tot.diferenciaAcumulada >= 0 ? '+' : ''}{Number(tot.diferenciaAcumulada || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Desglose desplegable con Accordion */}
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={`salida-${isSinSalida ? 'sin-salida-' + s.vendedor_id : s.id}`} className="border-none">
                              <AccordionTrigger className="text-sm py-2 text-primary hover:no-underline font-medium">
                                <span>Ver desglose día a día de esta Salida ({resumenesList.length} reportes)</span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <div className="space-y-4">
                                  {/* Tabla Día a Día */}
                                  <div>
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                                      Reportes Diarios Registrados (Día 1 hasta retorno)
                                    </h4>
                                    {resumenesList.length === 0 ? (
                                      <p className="text-sm text-muted-foreground italic py-2">
                                        No hay resúmenes diarios registrados aún para esta salida.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto border rounded-lg">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-muted/50 text-xs">
                                              <TableHead>Fecha</TableHead>
                                              <TableHead>Vendedor</TableHead>
                                              <TableHead>Conductor / Zona</TableHead>
                                              <TableHead className="text-right">Contado</TableHead>
                                              <TableHead className="text-right">Crédito</TableHead>
                                              <TableHead className="text-right">Adelantos</TableHead>
                                              <TableHead className="text-right">Cobranza</TableHead>
                                              <TableHead className="text-right">Yape/Plin/Depó.</TableHead>
                                              <TableHead className="text-right">Viáticos</TableHead>
                                              <TableHead className="text-right">Gastos</TableHead>
                                              <TableHead className="text-right">Saldo Entregado</TableHead>
                                              <TableHead className="text-right">Diferencia</TableHead>
                                              <TableHead>Estado</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {resumenesList.map((r: any, idx: number) => (
                                              <TableRow key={r.id} className="text-xs">
                                                <TableCell className="font-medium">
                                                  <span className="font-bold text-primary mr-1">Día {idx + 1}:</span>
                                                  {format(new Date((r.fecha || '').substring(0, 10) + 'T00:00:00'), 'dd/MM/yyyy')}
                                                </TableCell>
                                                <TableCell>{r.vendedor?.usuario?.nombre || '-'}</TableCell>
                                                <TableCell>{r.conductor || r.zona || '-'}</TableCell>
                                                <TableCell className="text-right text-emerald-600 font-medium">S/ {Number(r.contado).toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-amber-600">S/ {Number(r.credito).toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-purple-600 font-medium">S/ {Number(r.adelanto || 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">S/ {Number(r.cobranza).toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-sky-600 font-medium">S/ {Number(r.depositos || 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-indigo-600 font-medium">S/ {Number(r.viaticos).toFixed(2)}</TableCell>
                                                <TableCell className="text-right text-red-600">S/ {Number(r.total_gastos).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold">S/ {Number(r.saldo_entregado).toFixed(2)}</TableCell>
                                                <TableCell className={`text-right font-bold ${Number(r.diferencia) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                  {Number(r.diferencia) >= 0 ? '+' : ''}{Number(r.diferencia).toFixed(2)}
                                                </TableCell>
                                                <TableCell>{getEstadoBadge(r.estado)}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Auditoría de Stock de la Salida */}
                                  {item.stockAudit && (
                                    <div>
                                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5 text-primary" />
                                        Auditoría de Stock de la Salida (#{s.id})
                                      </h4>
                                      {renderStockAuditTable(item.stockAudit)}
                                    </div>
                                  )}

                                  {/* Viáticos Asignados al viaje */}
                                  {viaticosList.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                                        Viáticos Asignados a la Salida (#{s.id})
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {viaticosList.map((v: any) => (
                                          <div key={v.id} className="flex justify-between items-center p-2.5 bg-muted/40 rounded border text-xs">
                                            <div>
                                              <p className="font-semibold">{v.descripcion || `Viático #${v.id}`}</p>
                                              <p className="text-muted-foreground">{v.fecha} • Tipo: {v.tipo}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                                              S/ {Number(v.monto).toFixed(2)}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        );
      })()}

      {/* Modal de detalle */}
      <Dialog open={!!selectedResumen} onOpenChange={() => setSelectedResumen(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl md:max-w-4xl max-h-[92vh] p-3 sm:p-6 overflow-y-auto overflow-x-hidden rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Resumen de Ventas y Egresos</DialogTitle>
          </DialogHeader>

          {selectedResumen && (
            <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 min-w-0 w-full max-w-full overflow-x-hidden">
              {/* Header del resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 sm:p-4 bg-muted/50 rounded-lg text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground text-[11px]">Fecha</p>
                  <p className="font-medium">{format(new Date(selectedResumen.fecha.substring(0, 10) + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Vendedor</p>
                  <p className="font-medium truncate">{selectedResumen.vendedor?.usuario?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Estado</p>
                  {getEstadoBadge(selectedResumen.estado)}
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Conductor</p>
                  <p className="font-medium truncate">{selectedResumen.conductor || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Zona</p>
                  <p className="font-medium truncate">{selectedResumen.zona || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Ruta</p>
                  <p className="font-medium truncate">{selectedResumen.ruta?.nombre || '-'}</p>
                </div>
              </div>

              {/* Ingresos y Gastos lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Ingresos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                      Ingresos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Venta Contado</span>
                      <span className="font-medium">S/ {Number(selectedResumen.contado).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Venta Crédito</span>
                      <span className="font-medium">S/ {Number(selectedResumen.credito).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Adelantos</span>
                      <span className="font-medium">S/ {Number(selectedResumen.adelanto).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Cobranzas</span>
                      <span className="font-medium">S/ {Number(selectedResumen.cobranza).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-xs sm:text-sm">
                      <span>Total Ingresos</span>
                      <span className="text-emerald-600">
                        S/ {(Number(selectedResumen.contado) + Number(selectedResumen.cobranza) + Number(selectedResumen.adelanto)).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Depósitos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-sky-500" />
                      Depósitos / Transferencias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Yape / Plin / Bancos</span>
                      <span className="font-medium">S/ {Number(selectedResumen.depositos).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-xs sm:text-sm">
                      <span>Total Depósitos</span>
                      <span className="text-sky-600">
                        S/ {Number(selectedResumen.depositos).toLocaleString()}
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
                          const gastosCategoria = (Array.isArray(selectedResumen.gastos) ? selectedResumen.gastos : []).filter(g => g.tipo === cat || g.categoria === cat);
                          if (gastosCategoria.length === 0) return null;
                          const catLabels: Record<string, string> = {
                            gerencia: 'Gerencia', productora: 'Productora',
                            distribuidora: 'Distribuidora', descripcion_general: 'Descripción General',
                          };
                          return (
                            <div key={cat} className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{catLabels[cat] || cat}</p>
                              {gastosCategoria.map((gasto) => {
                                const estadoVerif = (gasto as any).estado || (gasto as any).estado_verificacion || 'PENDIENTE';
                                return (
                                  <div key={gasto.id} className="flex justify-between items-center pl-2 gap-2 text-xs sm:text-sm">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-muted-foreground truncate">{gasto.comprobante || gasto.descripcion}</span>
                                      {estadoVerif === 'CONFIRMADO' && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs shrink-0"><ShieldCheck className="h-3 w-3 mr-1" />Verificado</Badge>}
                                      {estadoVerif === 'PENDIENTE' && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] sm:text-xs shrink-0"><ShieldAlert className="h-3 w-3 mr-1" />No Verificado</Badge>}
                                      {estadoVerif === 'RECHAZADO' && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px] sm:text-xs shrink-0"><ShieldX className="h-3 w-3 mr-1" />No Aceptado</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-medium">S/ {Number(gasto.monto).toLocaleString()}</span>
                                      {selectedResumen.estado !== 'CONFIRMADO' && estadoVerif === 'PENDIENTE' && !isVendedor && (
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
                          .filter(g => !['gerencia', 'productora', 'distribuidora', 'descripcion_general'].includes(g.categoria || g.tipo))
                          .map((gasto) => {
                            const estadoVerif = (gasto as any).estado_verificacion || (gasto as any).estado || 'PENDIENTE';
                            return (
                              <div key={gasto.id} className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-muted-foreground truncate">{gasto.descripcion || gasto.comprobante}</span>
                                  <Badge variant="outline" className="text-[10px] sm:text-xs">{gasto.categoria || gasto.tipo}</Badge>
                                  {estadoVerif === 'CONFIRMADO' && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Verificado</Badge>}
                                  {estadoVerif === 'PENDIENTE' && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] sm:text-xs"><ShieldAlert className="h-3 w-3 mr-1" />No Verificado</Badge>}
                                  {estadoVerif === 'RECHAZADO' && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px] sm:text-xs"><ShieldX className="h-3 w-3 mr-1" />No Aceptado</Badge>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-medium">S/ {Number(gasto.monto).toLocaleString()}</span>
                                  {selectedResumen.estado !== 'CONFIRMADO' && estadoVerif === 'PENDIENTE' && !isVendedor && (
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
                    <div className="flex justify-between font-bold text-xs sm:text-sm">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
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
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="font-bold">Saldo Entregado Esperado</span>
                        <span className={`text-xl sm:text-2xl font-bold ${saldoCalculado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          S/ {saldoCalculado.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Auditoría de Stock de Salida */}
              {selectedResumen.stock_audit && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Auditoría de Stock de la Salida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderStockAuditTable(selectedResumen.stock_audit)}
                  </CardContent>
                </Card>
              )}

              {/* Resumen final */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Saldo Esperado</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        S/ {(Number(selectedResumen.contado) + Number(selectedResumen.cobranza) + Number(selectedResumen.adelanto) + Number(selectedResumen.viaticos) - Number(selectedResumen.total_gastos) - Number(selectedResumen.depositos)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Efectivo Recibido</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">S/ {Number(selectedResumen.saldo_entregado).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Diferencia</p>
                      <p className={`text-xl sm:text-2xl font-bold ${Number(selectedResumen.diferencia) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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

              {/* Botón de aprobar / anular */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedResumen(null)}>
                  {isVendedor ? 'Cerrar' : 'Cerrar / Cancelar'}
                </Button>
                {selectedResumen.estado === 'PENDIENTE' && !isVendedor && (
                  <>
                    <Button
                      className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                      onClick={() => handleRechazar(selectedResumen.id)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar Resumen
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                      onClick={() => handleAprobar(selectedResumen.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar Resumen
                    </Button>
                  </>
                )}
                {selectedResumen.estado === 'CONFIRMADO' && !isVendedor && (
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => handleAnular(selectedResumen.id)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Anular Resumen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailySummaryPage;
