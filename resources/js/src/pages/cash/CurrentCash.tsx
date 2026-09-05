import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, Clock, DollarSign,
  Lock, Unlock, TrendingUp, Calculator, AlertTriangle, Loader2, FileDown, CalendarIcon,
  Search, Check, CheckCircle2, XCircle, Plus, Filter, RefreshCw
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cajaService } from '@/services/cajaService';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatErrorMessage } from '@/lib/axios-error';

const CurrentCash = () => {
  const [isOpenCashDialog, setIsOpenCashDialog] = useState(false);
  const [isCloseCashDialog, setIsCloseCashDialog] = useState(false);
  const [isMovementDialog, setIsMovementDialog] = useState(false);
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingCount, setClosingCount] = useState('');
  const [movCategoria, setMovCategoria] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movDescripcion, setMovDescripcion] = useState('');
  const [movMetodoPago, setMovMetodoPago] = useState('EFECTIVO');
  const [movComprobante, setMovComprobante] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cajasSinCerrarCount, setCajasSinCerrarCount] = useState(0);
  const [isOpenCajasSinCerrarDialog, setIsOpenCajasSinCerrarDialog] = useState(false);
  const [isClosingAntiguas, setIsClosingAntiguas] = useState(false);

  // Tabs y filtros
  const [activeTab, setActiveTab] = useState<'no_conciliado' | 'conciliado'>('no_conciliado');
  const [typeFilter, setTypeFilter] = useState<'all' | 'INGRESO' | 'EGRESO'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [conciliandoId, setConciliandoId] = useState<number | null>(null);

  // Dialog de rechazo / observación
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; movId: number | null }>({ open: false, movId: null });
  const [rejectMotivo, setRejectMotivo] = useState('');

  // Por Definir Dialog State
  const [porDefinirDialog, setPorDefinirDialog] = useState<{ open: boolean; mov: any | null }>({ open: false, mov: null });
  const [pdTipoComprobante, setPdTipoComprobante] = useState('');
  const [pdComprobante, setPdComprobante] = useState('');

  const [cajaActual, setCajaActual] = useState<any | null>(null);
  const movimientos: any[] = cajaActual?.movimientos ?? [];
  const saldoInicial = Number(cajaActual?.saldo_inicial) || 0;
  const isOpen = cajaActual?.estado === 'ABIERTA';

  const totalIngresosDia = movimientos
    .filter(m => m.tipo === 'INGRESO' && m.estado === 'APROBADO')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalEgresosDia = movimientos
    .filter(m => m.tipo === 'EGRESO' && m.estado === 'APROBADO')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalPagosDigitales = movimientos
    .filter(m => m.tipo === 'INGRESO' && m.estado === 'APROBADO' && (m.metodo_pago ?? 'EFECTIVO').toUpperCase() !== 'EFECTIVO')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const saldoActual = saldoInicial + totalIngresosDia - totalEgresosDia - totalPagosDigitales;

  const totalConciliado = movimientos
    .filter(m => m.estado === 'APROBADO')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const totalNoConciliado = movimientos
    .filter(m => m.estado === 'PENDIENTE')
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const countNoConciliado = movimientos.filter(m => m.estado === 'PENDIENTE').length;
  const countConciliado = movimientos.filter(m => m.estado === 'APROBADO').length;

  const fetchCajaActual = async () => {
    try {
      setIsLoading(true);
      const data = await cajaService.getCaja();
      setCajaActual(data);
    } catch (error) {
      console.log('Error al cargar caja:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCajasSinCerrar = async () => {
    try {
      const data = await cajaService.getCajasSinCerrar();
      if (data && data.cantidad > 0) {
        setCajasSinCerrarCount(data.cantidad);
        setIsOpenCajasSinCerrarDialog(true);
      }
    } catch (error) {
      console.log('Error al verificar cajas sin cerrar:', error);
    }
  };

  const handleCerrarCajasAntiguas = async () => {
    setIsClosingAntiguas(true);
    try {
      await cajaService.cerrarCajasAntiguas();
      toast.success("Cajas anteriores cerradas automáticamente.");
      setIsOpenCajasSinCerrarDialog(false);
      setCajasSinCerrarCount(0);
      await fetchCajaActual();
    } catch (error) {
      toast.error(formatErrorMessage('Error al cerrar cajas anteriores', error, 'No se pudieron cerrar las cajas anteriores.'));
    } finally {
      setIsClosingAntiguas(false);
    }
  };

  useEffect(() => {
    fetchCajaActual();
    checkCajasSinCerrar();
  }, []);

  const handleOpenCash = async () => {
    try {
      await cajaService.abrirCaja({
        monto_apertura: Number(openingAmount),
      });
      await fetchCajaActual();
      toast.success("Caja abierta correctamente");
    } catch (error) {
      toast.error(formatErrorMessage('Error al abrir caja', error, 'No se pudo abrir la caja.'));
    }
    setIsOpenCashDialog(false);
    setOpeningAmount('');
  };

  const handleCloseCash = async () => {
    if (!cajaActual) return;
    if (countNoConciliado > 0) {
      toast.error(`No se puede cerrar la caja. Existen ${countNoConciliado} movimiento(s) pendiente(s) de conciliar.`);
      return;
    }
    try {
      await cajaService.cerrarCaja(cajaActual.id, Number(cajaActual.saldo_actual), Number(closingCount));
      await fetchCajaActual();
      toast.success("Caja cerrada correctamente");
      setIsCloseCashDialog(false);
      setClosingCount('');
    } catch (error) {
      toast.error(formatErrorMessage('Error al cerrar caja', error, 'No se pudo cerrar la caja.'));
    }
  };

  const handleMovement = async () => {
    if (!movCategoria || !movMonto || !movDescripcion) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }
    try {
      await cajaService.createMovimiento({
        caja_id: cajaActual.id,
        tipo: movementType,
        metodo_pago: movMetodoPago,
        comprobante: movComprobante || undefined,
        categoria: movCategoria,
        descripcion: movDescripcion,
        monto: Number(movMonto),
      });
      setIsMovementDialog(false);
      setMovCategoria('');
      setMovMonto('');
      setMovDescripcion('');
      setMovComprobante('');
      setMovMetodoPago('EFECTIVO');
      await fetchCajaActual();
      toast.success("Movimiento registrado en estado PENDIENTE");
    } catch (error) {
      toast.error(formatErrorMessage('Error al crear movimiento', error, 'No se pudo crear el movimiento.'));
    }
  };

  const getSaldoDisponibleMetodo = (metodo: string) => {
    const met = (metodo || 'EFECTIVO').toUpperCase();
    if (met === 'EFECTIVO') return saldoActual;

    const ingresosMetodo = movimientos
      .filter(m => m.tipo === 'INGRESO' && m.estado === 'APROBADO' && (m.metodo_pago ?? 'EFECTIVO').toUpperCase() === met)
      .reduce((acc, m) => acc + Number(m.monto), 0);

    const egresosMetodo = movimientos
      .filter(m => m.tipo === 'EGRESO' && m.estado === 'APROBADO' && (m.metodo_pago ?? 'EFECTIVO').toUpperCase() === met)
      .reduce((acc, m) => acc + Number(m.monto), 0);

    return ingresosMetodo - egresosMetodo;
  };

  const handleConciliar = async (movId: number, estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE', motivo?: string, tipo_comprobante?: string, comprobante?: string) => {
    const targetMov = movimientos.find(m => m.id === movId);

    // Validación preventiva en cliente al conciliar un egreso de cualquier método de pago
    if (targetMov && estado === 'APROBADO' && targetMov.tipo === 'EGRESO') {
      const met = (targetMov.metodo_pago ?? 'EFECTIVO').toUpperCase();
      const saldoDisponible = getSaldoDisponibleMetodo(met);
      const montoEgreso = Number(targetMov.monto);

      if (montoEgreso > saldoDisponible) {
        toast.error(`No se puede conciliar el egreso en ${met} (S/ ${montoEgreso.toFixed(2)}) porque dejaría el saldo en negativo. Saldo disponible en ${met}: S/ ${Math.max(0, saldoDisponible).toFixed(2)}.`);
        return;
      }
    }

    setConciliandoId(movId);
    try {
      await cajaService.conciliarMovimiento(movId, { estado, motivo, tipo_comprobante, comprobante });
      toast.success(
        estado === 'APROBADO'
          ? "Movimiento conciliado / verificado correctamente"
          : estado === 'PENDIENTE'
            ? "Conciliación anulada y devuelta a pendiente"
            : "Movimiento rechazado correctamente"
      );
      await fetchCajaActual();
    } catch (error) {
      toast.error(formatErrorMessage('Error al conciliar', error, 'No se pudo procesar la conciliación.'));
    } finally {
      setConciliandoId(null);
      setRejectDialog({ open: false, movId: null });
      setRejectMotivo('');
    }
  };

  // Filtrado de tabla
  const filteredMovimientos = movimientos.filter((mov) => {
    // Tab filter
    if (activeTab === 'no_conciliado' && mov.estado !== 'PENDIENTE') return false;
    if (activeTab === 'conciliado' && mov.estado !== 'APROBADO') return false;

    // Type filter
    if (typeFilter !== 'all' && mov.tipo !== typeFilter) return false;

    // Date filter
    if (filterDate) {
      const movDate = format(new Date(mov.created_at), 'yyyy-MM-dd');
      if (movDate !== filterDate) return false;
    }

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchDesc = (mov.descripcion || '').toLowerCase().includes(q);
      const matchCat = (mov.categoria || '').toLowerCase().includes(q);
      const matchComp = (mov.comprobante || '').toLowerCase().includes(q);
      const matchUser = (mov.caja?.usuario?.nombre || '').toLowerCase().includes(q);
      const matchMonto = (mov.monto || '').toString().includes(q);
      return matchDesc || matchCat || matchComp || matchUser || matchMonto;
    }

    return true;
  });

  const itemsPerPage = 8;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredMovimientos.length / itemsPerPage) || 1;
  const paginatedMovimientos = filteredMovimientos.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta de Cajas Abiertas de días anteriores */}
      {cajasSinCerrarCount > 0 && (
        <Alert variant="destructive" className="bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <AlertTitle className="font-bold text-base">Cajas de días anteriores sin cerrar ({cajasSinCerrarCount})</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
            <span className="text-xs">
              Existen cajas abiertas de fechas anteriores. Para poder aperturar la caja del día de hoy, debes cerrar las anteriores. Al hacerlo, el sistema auto-conciliará los movimientos pendientes y asumirá que el saldo teórico coincide con el conteo real.
            </span>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap shadow-sm"
              onClick={() => setIsOpenCajasSinCerrarDialog(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Cerrar Cajas Anteriores
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header wireframe replica */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            Caja Actual
            {isOpen ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-300">
                Caja Abierta
              </Badge>
            ) : (
              <Badge variant="secondary">Caja Cerrada</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control y gestión de caja del día: Ingresos (ventas) y egresos registrados para conciliación.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchCajaActual} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {isOpen ? (
            <>
              <Dialog open={isMovementDialog} onOpenChange={setIsMovementDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    + Nuevo Ingreso / Egreso
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Nuevo Movimiento de Caja</DialogTitle>
                    <DialogDescription>
                      El movimiento ingresará como **PENDIENTE** para ser conciliado por administración.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={movementType} onValueChange={(v: 'ingreso' | 'egreso') => setMovementType(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ingreso">Ingreso (+)</SelectItem>
                            <SelectItem value="egreso">Egreso (-)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Método de Pago</Label>
                        <Select value={movMetodoPago} onValueChange={setMovMetodoPago}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                            <SelectItem value="YAPE">Yape</SelectItem>
                            <SelectItem value="PLIN">Plin</SelectItem>
                            <SelectItem value="DEPOSITO">Depósito Bancario</SelectItem>
                            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={movCategoria} onValueChange={setMovCategoria}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                        <SelectContent>
                          {movementType === 'ingreso' ? (
                            <>
                              <SelectItem value="Ventas">Venta Mostrador / Fábrica</SelectItem>
                              <SelectItem value="Cobranzas">Cobranza / Abono</SelectItem>
                              <SelectItem value="Otros">Otro Ingreso</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Gastos Operativos">Gasto Operativo</SelectItem>
                              <SelectItem value="Servicios">Servicios (Luz, agua, etc.)</SelectItem>
                              <SelectItem value="Pago Proveedor">Pago Proveedor</SelectItem>
                              <SelectItem value="Otros">Otro Egreso</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monto (S/)</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>N° Comprobante / Op. (Opcional)</Label>
                        <Input placeholder="Ej: B001-0452 o Op: 9812" value={movComprobante} onChange={(e) => setMovComprobante(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Concepto / Descripción</Label>
                      <Textarea placeholder="Detalle o justificación del movimiento..." value={movDescripcion} onChange={(e) => setMovDescripcion(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMovementDialog(false)}>Cancelar</Button>
                    <Button onClick={handleMovement} className={movementType === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}>
                      Registrar Movimiento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCloseCashDialog} onOpenChange={setIsCloseCashDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Lock className="h-4 w-4 mr-2" />Cerrar Caja</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cierre de Caja del Día</DialogTitle>
                    <DialogDescription>Calculado únicamente sobre saldo conciliado en EFECTIVO.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {countNoConciliado > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 font-medium space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-200">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Imposible realizar el cierre de caja
                        </div>
                        <p>
                          Existen <strong>{countNoConciliado} movimiento(s) pendiente(s) de conciliar</strong>. Debes conciliar o rechazar todos los movimientos antes de realizar el cierre.
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Saldo teórico en EFECTIVO:</span>
                        <span className="font-bold text-emerald-600">S/ {Number(saldoActual).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Conteo Real en Efectivo (S/)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={closingCount}
                        disabled={countNoConciliado > 0}
                        onChange={(e) => setClosingCount(e.target.value)}
                      />
                    </div>
                    {closingCount && (
                      <div className={`p-4 rounded-lg ${Number(closingCount) === saldoActual ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                        <div className="flex justify-between">
                          <span>Diferencia:</span>
                          <span className={`font-bold ${Number(closingCount) === saldoActual ? 'text-emerald-600' : 'text-amber-600'}`}>
                            S/ {(Number(closingCount) - saldoActual).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCloseCashDialog(false)}>Cancelar</Button>
                    <Button
                      variant="destructive"
                      disabled={countNoConciliado > 0 || !closingCount}
                      onClick={handleCloseCash}
                    >
                      Confirmar Cierre
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Dialog open={isOpenCashDialog} onOpenChange={setIsOpenCashDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"><Unlock className="h-4 w-4 mr-2" />Abrir Caja</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abrir Caja del Día</DialogTitle>
                  <DialogDescription>Ingresa el monto de apertura en efectivo</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Monto de Apertura (S/)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpenCashDialog(false)}>Cancelar</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenCash}>Abrir Caja</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Ingresos del Día */}
        <Card className="shadow-sm border border-border">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">INGRESOS DEL DÍA</p>
            <p className="text-2xl font-bold text-foreground mt-1">S/ {totalIngresosDia.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        {/* Card 2: Egresos del Día */}
        <Card className="shadow-sm border border-border">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">EGRESOS DEL DÍA</p>
            <p className="text-2xl font-bold text-foreground mt-1">S/ {totalEgresosDia.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        {/* Card 3: INGRESOS DIGITALES (Fondo azul/sky destacado) */}
        <Card className="shadow-sm bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider font-semibold text-sky-800 dark:text-sky-400">INGRESOS DIGITALES</p>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">S/ {totalPagosDigitales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">Yape, Plin, Depósitos, Transf.</p>
          </CardContent>
        </Card>

        {/* Card 4: CONCILIADO (Fondo verde suave destacado) */}
        <Card className="shadow-sm bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider font-semibold text-emerald-800 dark:text-emerald-400">CONCILIADO</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">S/ {totalConciliado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        {/* Card 5: NO CONCILIADO (Fondo crema / naranja suave destacado) */}
        <Card className="shadow-sm bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider font-semibold text-amber-800 dark:text-amber-400">NO CONCILIADO</p>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">S/ {totalNoConciliado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Saldo exclusivo EFECTIVO Banner Info */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            S/
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Saldo Físico en EFECTIVO Conciliado</p>
            <p className="text-xl font-bold text-emerald-400">S/ {Number(saldoActual).toFixed(2)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 max-w-md">
          ℹ️ Los pagos digitales (Yape, Plin, Depósitos, Transferencias) figuran en la lista de caja para su conciliación, pero no incrementan ni decrementan el saldo en efectivo físico.
        </div>
      </div>

      {/* Secciones con Pestañas: No conciliado vs Conciliado */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => { setActiveTab('no_conciliado'); setPage(1); }}
              className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${activeTab === 'no_conciliado'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              No conciliado
              <span className="bg-indigo-600 text-white rounded-full text-xs px-2 py-0.5 font-bold">
                {countNoConciliado}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('conciliado'); setPage(1); }}
              className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold border-b-2 transition-all ${activeTab === 'conciliado'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Conciliado
              <span className="bg-indigo-600 text-white rounded-full text-xs px-2 py-0.5 font-bold">
                {countConciliado}
              </span>
            </button>
          </div>

          {/* Controls Bar: Type, Date, Search */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Select value={typeFilter} onValueChange={(v: 'all' | 'INGRESO' | 'EGRESO') => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="INGRESO">Ingreso</SelectItem>
                <SelectItem value="EGRESO">Egreso</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
              className="w-full sm:w-44"
            />

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar comprobante o cliente..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            {filterDate && (
              <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>Limpiar fecha</Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-bold">FECHA</TableHead>
                <TableHead className="font-bold">TIPO</TableHead>
                <TableHead className="font-bold">CONCEPTO</TableHead>
                <TableHead className="font-bold">COMPROBANTE / MEDIO</TableHead>
                <TableHead className="font-bold text-right">MONTO</TableHead>
                <TableHead className="font-bold text-center">
                  {activeTab === 'no_conciliado' ? 'ACCIÓN' : 'ESTADO'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMovimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No se encontraron movimientos en la pestaña de <strong>{activeTab === 'no_conciliado' ? 'No conciliado' : 'Conciliado'}</strong>.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMovimientos.map((mov) => {
                  const isIngreso = mov.tipo === 'INGRESO';
                  const metodoPagoStr = (mov.metodo_pago || 'EFECTIVO').toUpperCase();
                  const compStr = mov.comprobante || '-';

                  return (
                    <TableRow key={mov.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                        {format(new Date(mov.created_at), 'dd/MM/yyyy')}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={
                            isIngreso
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 hover:bg-red-100'
                          }
                        >
                          {isIngreso ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{mov.descripcion}</p>
                          {mov.categoria && (
                            <span className="text-xs text-muted-foreground font-normal">Categoría: {mov.categoria}</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-mono text-sm">{compStr}</p>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                            {metodoPagoStr}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className={`text-right font-bold text-base whitespace-nowrap ${isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isIngreso ? '+' : '-'} S/ {Number(mov.monto).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        {activeTab === 'no_conciliado' ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={conciliandoId === mov.id}
                              onClick={() => {
                                const isPorDefinir = mov.gasto?.tipo_comprobante === 'Por Definir' || mov.tipo_comprobante === 'Por Definir';
                                if (isPorDefinir) {
                                  setPorDefinirDialog({ open: true, mov });
                                  setPdTipoComprobante('');
                                  setPdComprobante('');
                                } else {
                                  handleConciliar(mov.id, 'APROBADO');
                                }
                              }}
                              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold"
                            >
                              {conciliandoId === mov.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1 text-emerald-600" />
                                  Conciliar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                              onClick={() => setRejectDialog({ open: true, movId: mov.id })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              Verificado por admin
                            </span>
                            {mov.conciliador?.nombre && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                por {mov.conciliador.nombre}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={conciliandoId === mov.id}
                              onClick={() => {
                                if (window.confirm('¿Desea anular la conciliación de este movimiento y devolverlo a estado PENDIENTE?')) {
                                  handleConciliar(mov.id, 'PENDIENTE');
                                }
                              }}
                              className="text-[11px] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 h-7 px-2 mt-1 border border-amber-300/60 dark:border-amber-800/60"
                              title="Anular la conciliación y devolver el movimiento a la pestaña No conciliado"
                            >
                              {conciliandoId === mov.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 text-amber-600" />
                                  Anular conciliación
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Mostrando {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredMovimientos.length)} de {filteredMovimientos.length} movimientos
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t border-border bg-muted/20 rounded-b-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Nota:</strong> En "No conciliado" cada fila permite **Conciliar** o **Rechazar**. En "Conciliado" se muestra la verificación y el botón **Anular conciliación** para devolver cualquier movimiento a estado *Pendiente* si se detectan inconsistencias.
          </p>
        </div>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog({ open: o, movId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Movimiento</DialogTitle>
            <DialogDescription>
              Ingresa el motivo del rechazo del movimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Motivo / Observación</Label>
            <Textarea
              placeholder="Explica el motivo por el que se rechaza la conciliación..."
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, movId: null })}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog.movId && handleConciliar(rejectDialog.movId, 'RECHAZADO', rejectMotivo)}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Por Definir dialog */}
      <Dialog open={porDefinirDialog.open} onOpenChange={(o) => setPorDefinirDialog({ open: o, mov: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Información del Comprobante</DialogTitle>
            <DialogDescription>
              El comprobante de este movimiento fue registrado como "Por Definir". Por favor, indique el tipo y número de comprobante para conciliarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo Comprobante *</Label>
              <Select value={pdTipoComprobante} onValueChange={setPdTipoComprobante}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo comprobante..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boleta">Boleta</SelectItem>
                  <SelectItem value="Factura">Factura</SelectItem>
                  <SelectItem value="Ticket">Ticket</SelectItem>
                  <SelectItem value="Comprobante de Caja">Comprobante de Caja</SelectItem>
                  <SelectItem value="Otro/Ninguno">Otro/Ninguno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comprobante / Referencia</Label>
              <Input
                placeholder="Número de boleta, serie, etc."
                value={pdComprobante}
                onChange={(e) => setPdComprobante(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPorDefinirDialog({ open: false, mov: null })}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!pdTipoComprobante}
              onClick={() => {
                if (porDefinirDialog.mov) {
                  handleConciliar(porDefinirDialog.mov.id, 'APROBADO', undefined, pdTipoComprobante, pdComprobante);
                  setPorDefinirDialog({ open: false, mov: null });
                }
              }}
            >
              Confirmar y Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para cerrar cajas sin cerrar de días anteriores */}
      <Dialog open={isOpenCajasSinCerrarDialog} onOpenChange={setIsOpenCajasSinCerrarDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Cajas Abiertas de Días Anteriores
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground space-y-2">
              Se han detectado <strong>{cajasSinCerrarCount} caja(s) abierta(s)</strong> correspondientes a días anteriores.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-2 text-amber-900 dark:text-amber-300">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              ⚠️ Advertencia del Sistema:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>El sistema asumirá que el <strong>saldo final del sistema coincide con el conteo real</strong> de cada caja anterior.</li>
              <li>Todos los movimientos en estado pendiente de esas fechas se <strong>conciliarán automáticamente</strong>.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsOpenCajasSinCerrarDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              disabled={isClosingAntiguas}
              onClick={handleCerrarCajasAntiguas}
            >
              {isClosingAntiguas ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cerrando cajas...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Cerrar Todas las Cajas Anteriores
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CurrentCash;
