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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Search, CreditCard, DollarSign, AlertTriangle, Clock, Filter, CheckCircle, Loader2, Eye, Plus, Trash2, Ban, Calendar as CalendarIcon } from 'lucide-react';
import { format, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cobranzasService } from '@/services/cobranzasService';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

const AccountsReceivable = () => {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [filterZona, setFilterZona] = useState<string>('all');
  const [dateRangeVenta, setDateRangeVenta] = useState<{ from: Date; to: Date } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [bank, setBank] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const [isSplitPay, setIsSplitPay] = useState(false);
  const [splitPayRows, setSplitPayRows] = useState<{ metodo_pago: string; monto: number; banco?: string; numero_operacion?: string }[]>([]);

  const [pagosDialog, setPagosDialog] = useState<any>(null);
  const [cuentaPagos, setCuentaPagos] = useState<any[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const [anularDialog, setAnularDialog] = useState<any | null>(null);
  const [isAnulling, setIsAnulling] = useState(false);

  const handleVerPagos = async (cuenta: any) => {
    setPagosDialog(cuenta);
    setLoadingPagos(true);
    try {
      const data = await cobranzasService.getPagosCuenta(cuenta.id);
      setCuentaPagos(data);
    } catch (error) {
      console.error('Error fetching pagos:', error);
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleAnularAbono = async () => {
    if (!anularDialog) return;
    try {
      setIsAnulling(true);
      await cobranzasService.anularAbono(anularDialog.id);
      toast.success('Abono anulado con éxito');
      setAnularDialog(null);
      if (pagosDialog) {
        const data = await cobranzasService.getPagosCuenta(pagosDialog.id);
        setCuentaPagos(data);
      }
      fetchCuentas();
    } catch (error: any) {
      toast.error(formatErrorMessage('Error al anular abono', error, 'No se pudo anular el abono.'));
    } finally {
      setIsAnulling(false);
    }
  };

  const fetchCuentas = async () => {
    setIsLoading(true);
    try {
      const data = await cobranzasService.getCuentasPorCobrar();
      setCuentas(data);
      console.log(data);
    } catch (error) {
      console.error('Error fetching cuentas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendedores = async () => {
    setIsLoading(true);
    try {
      const data = await cobranzasService.getVendedores();
      setVendedores(data);
    } catch (error) {
      console.error('Error fetching vendedores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
    fetchVendedores();
  }, []);

  const zonas = Array.from(
    new Set(
      cuentas
        .map(a => a.zona_nombre)
        .filter(Boolean)
    )
  ).sort();

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, filterVendedor, filterZona, dateRangeVenta]);

  const filteredAccounts = cuentas.filter((account) => {
    const matchesSearch =
      !searchTerm.trim() ||
      (account.cliente?.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (account.cliente?.codigo_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (account.zona_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (account.ruta_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (account.venta?.nota_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const normalizedState = (account.estado || '').toUpperCase();
    const matchesStatus = statusFilter === 'all' || normalizedState === statusFilter.toUpperCase();

    const matchesVendedor = filterVendedor === 'all' || String(account.venta?.vendedor_id) === String(filterVendedor);

    const matchesZona = filterZona === 'all' || account.zona_nombre === filterZona;

    let matchesFechaVenta = true;
    if (dateRangeVenta?.from && dateRangeVenta?.to) {
      if (account.venta?.fecha) {
        const fechaStr = typeof account.venta.fecha === 'string' ? account.venta.fecha.substring(0, 10) : '';
        if (fechaStr) {
          const vDate = new Date(fechaStr + 'T00:00:00');
          const fromDate = new Date(dateRangeVenta.from);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(dateRangeVenta.to);
          toDate.setHours(23, 59, 59, 999);
          matchesFechaVenta = vDate >= fromDate && vDate <= toDate;
        } else {
          matchesFechaVenta = false;
        }
      } else {
        matchesFechaVenta = false;
      }
    }

    return matchesSearch && matchesStatus && matchesVendedor && matchesZona && matchesFechaVenta;
  });

  const itemsPerPage = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);

  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const normalized = (status || '').toUpperCase();
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDIENTE: { variant: 'secondary', label: 'PENDIENTE' },
      PARCIAL: { variant: 'outline', label: 'PARCIAL' },
      PAGADO: { variant: 'default', label: 'PAGADO' },
      PAGADA: { variant: 'default', label: 'PAGADO' },
      VENCIDO: { variant: 'destructive', label: 'VENCIDO' },
      VENCIDA: { variant: 'destructive', label: 'VENCIDO' },
    };
    const config = variants[normalized] || { variant: 'outline', label: normalized };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysInfo = (account: any) => {
    if (!account) return { diasPlazo: 0, text: 'Sin fecha de vencimiento establecida', isOverdue: false };

    let diasPlazo = account.cliente?.dias_credito || 0;
    if (!diasPlazo && account.fecha_vencimiento && account.venta?.fecha) {
      const start = new Date(typeof account.venta.fecha === 'string' ? account.venta.fecha.substring(0, 10) + "T00:00:00" : account.venta.fecha);
      const end = new Date(typeof account.fecha_vencimiento === 'string' ? account.fecha_vencimiento.substring(0, 10) + "T00:00:00" : account.fecha_vencimiento);
      diasPlazo = Math.max(0, differenceInDays(end, start));
    }

    if (!account.fecha_vencimiento) {
      return { diasPlazo, text: 'Sin fecha de vencimiento establecida', isOverdue: false };
    }

    const dueDate = new Date(typeof account.fecha_vencimiento === 'string' ? account.fecha_vencimiento.substring(0, 10) + "T00:00:00" : account.fecha_vencimiento);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = differenceInDays(dueDate, today);

    if (days < 0) {
      return { diasPlazo, text: `${Math.abs(days)} días vencido`, isOverdue: true };
    } else if (days === 0) {
      return { diasPlazo, text: 'Vence hoy', isOverdue: false };
    } else {
      return { diasPlazo, text: `${days} días restantes`, isOverdue: false };
    }
  };

  const handlePayment = async (id: string) => {
    const selectedFecha = paymentDate || format(new Date(), 'yyyy-MM-dd');
    if (isSplitPay) {
      const totalSplit = splitPayRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
      if (totalSplit <= 0) {
        toast.error('Ingrese al menos un monto mayor a cero.');
        return;
      }
      if (selectedAccount && totalSplit > selectedAccount.saldo) {
        toast.error(`El monto total (S/ ${totalSplit.toFixed(2)}) supera el saldo pendiente (S/ ${Number(selectedAccount.saldo).toFixed(2)}).`);
        return;
      }
      try {
        await cobranzasService.registrarAbono(id, {
          fecha: selectedFecha,
          pagos: splitPayRows
        });
        toast.success('Pagos registrados exitosamente');
        fetchCuentas();
        setIsDialogOpen(false);
        setIsSplitPay(false);
        setSplitPayRows([]);
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      } catch (error: any) {
        console.log("ERROR COMPLETO:", error);
        console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
        toast.error(formatErrorMessage('Error al crear abonos', error, 'No se pudieron crear los abonos.'));
      }
      return;
    }

    if (payMethod === 'DEPOSITO') {
      if (!bank.trim() || !operationNumber.trim()) {
        toast.error('Por favor ingresa el banco y el número de operación para depósitos.');
        return;
      }
    }
    try {
      await cobranzasService.registrarAbono(id, {
        fecha: selectedFecha,
        monto: Number(paymentAmount),
        metodo_pago: payMethod,
        banco: payMethod === 'DEPOSITO' ? bank : undefined,
        numero_operacion: payMethod === 'DEPOSITO' ? operationNumber : undefined,
      });
      toast.success('Pago registrado exitosamente');
      fetchCuentas();
      setIsDialogOpen(false);
      setPaymentAmount('');
      setBank('');
      setOperationNumber('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error: any) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear abono', error, 'No se pudo crear el abono.'));
    }
  };

  const totalPending = cuentas
    .filter(a => (a.estado || '').toUpperCase() !== 'PAGADO')
    .reduce((acc, a) => acc + Number(a.saldo), 0);

  const totalOverdue = cuentas
    .filter(a => (a.estado || '').toUpperCase() === 'VENCIDO' || (a.estado || '').toUpperCase() === 'VENCIDA')
    .reduce((acc, a) => acc + Number(a.saldo), 0);

  const totalPartial = cuentas
    .filter(a => (a.estado || '').toUpperCase() === 'PARCIAL')
    .reduce((acc, a) => acc + Number(a.saldo), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cuentas por Cobrar
          </h1>
          <p className="text-muted-foreground">
            Gestión de deudas y cobranzas de clientes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total por Cobrar</p>
                <p className="text-2xl font-bold text-foreground">
                  S/ {totalPending.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  S/ {totalOverdue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagos Parciales</p>
                <p className="text-2xl font-bold text-foreground">
                  S/ {totalPartial.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuentas Activas</p>
                <p className="text-2xl font-bold text-foreground">
                  {cuentas.filter(a => (a.estado || '').toUpperCase() !== 'PAGADO').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative xl:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, código, zona o ruta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="VENCIDO">Vencida</SelectItem>
                <SelectItem value="PAGADO">Pagada</SelectItem>
              </SelectContent>
            </Select>

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

            <Select value={filterZona} onValueChange={setFilterZona}>
              <SelectTrigger>
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zonas.map(z => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal min-w-0 w-full">
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {dateRangeVenta?.from && dateRangeVenta?.to
                      ? `Venta: ${format(dateRangeVenta.from, 'dd/MM')} - ${format(dateRangeVenta.to, 'dd/MM')}`
                      : 'Fecha de Venta'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Filtros Rápidos (Fecha Venta)</p>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal" onClick={() => setDateRangeVenta({ from: new Date(), to: new Date() })}>Hoy</Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal" onClick={() => setDateRangeVenta({ from: startOfWeek(new Date(), { locale: es }), to: endOfWeek(new Date(), { locale: es }) })}>Esta semana</Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal" onClick={() => setDateRangeVenta({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Este mes</Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal text-muted-foreground" onClick={() => setDateRangeVenta(null)}>Todas las fechas</Button>
                  </div>
                  <Separator />
                  <div className="space-y-2 px-1">
                    <p className="text-xs font-semibold text-muted-foreground">Rango Personalizado</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Desde</label>
                        <Input
                          type="date"
                          className="h-8 text-xs px-2"
                          value={dateRangeVenta?.from ? format(dateRangeVenta.from, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const [y, m, d] = val.split('-').map(Number);
                            const newFrom = new Date(y, m - 1, d);
                            setDateRangeVenta(prev => ({ from: newFrom, to: prev?.to || newFrom }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Hasta</label>
                        <Input
                          type="date"
                          className="h-8 text-xs px-2"
                          value={dateRangeVenta?.to ? format(dateRangeVenta.to, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const [y, m, d] = val.split('-').map(Number);
                            const newTo = new Date(y, m - 1, d);
                            setDateRangeVenta(prev => ({ from: prev?.from || newTo, to: newTo }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {(searchTerm || statusFilter !== 'all' || filterVendedor !== 'all' || filterZona !== 'all' || dateRangeVenta !== null) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setFilterVendedor('all');
                  setFilterZona('all');
                  setDateRangeVenta(null);
                }}
                className="h-10 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Listado de Cuentas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {filteredAccounts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hay cuentas registradas
              </div>
            ) : (
              paginatedAccounts.map((account) => {
                const daysInfo = getDaysInfo(account);
                const isPaid = (account.estado || '').toUpperCase() === 'PAGADO';
                return (
                  <div key={account.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{account.cliente?.razon_social}</span>
                          {account.es_ruta_actual ? (
                            <Badge variant="default" className="bg-emerald-600 text-[10px] py-0 px-1.5 h-4">Ruta Actual</Badge>
                          ) : account.es_zona_actual ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] py-0 px-1.5 h-4">Zona Actual</Badge>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{account.cliente?.codigo_cliente || account.cliente?.tipo || '-'} {account.zona_nombre ? `• ${account.zona_nombre}` : ''}</p>
                      </div>
                      {getStatusBadge(account.estado)}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-border/50 text-center">
                      <div className="bg-muted/40 p-1.5 rounded border">
                        <span className="text-[10px] text-muted-foreground block">Monto Orig.</span>
                        <span className="font-semibold text-foreground">S/ {Number(account.monto_total).toLocaleString()}</span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded border border-emerald-200">
                        <span className="text-[10px] text-muted-foreground block">Pagado</span>
                        <span className="font-bold text-emerald-600">S/ {Number(account.monto_pagado).toLocaleString()}</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded border border-amber-200">
                        <span className="text-[10px] text-muted-foreground block">Saldo Actual</span>
                        <span className="font-bold text-amber-600">S/ {Number(account.saldo).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <div>
                        <span className="block">🛒 Venta: <strong>{account.venta?.fecha ? format(new Date(typeof account.venta.fecha === 'string' ? account.venta.fecha.substring(0, 10) + "T00:00:00" : account.venta.fecha), "dd/MM/yyyy") : '-'}</strong></span>
                        <span>📅 Venc: <strong>{account.fecha_vencimiento ? format(new Date(typeof account.fecha_vencimiento === 'string' ? account.fecha_vencimiento.substring(0, 10) + "T00:00:00" : account.fecha_vencimiento), "dd/MM/yyyy") : 'Sin fecha'}</strong></span>
                        {!isPaid && account.fecha_vencimiento && (
                          <span className={`block text-[10px] ${daysInfo.isOverdue ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>{daysInfo.text}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                      <Button size="sm" variant="ghost" className="h-8 text-xs font-medium border" onClick={() => handleVerPagos(account)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver Pagos
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-warm hover:opacity-90 h-8 text-xs font-semibold"
                        disabled={isPaid}
                        onClick={() => { setSelectedAccount(account); setIsDialogOpen(true); }}
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1" /> Cobrar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto w-full border rounded-lg">
            <Table className="w-full min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente / Ubicación</TableHead>
                  <TableHead>Fecha de Venta</TableHead>
                  <TableHead className="text-right">Monto Original</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Saldo Actual</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccounts.map((account) => {
                  const daysInfo = getDaysInfo(account);
                  const isPaid = (account.estado || '').toUpperCase() === 'PAGADO';
                  return (
                    <TableRow key={account.id} className="hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium">{account.cliente?.razon_social}</p>
                            {account.es_ruta_actual ? (
                              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-[10px] py-0 px-1.5 h-4">Ruta Actual</Badge>
                            ) : account.es_zona_actual ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] py-0 px-1.5 h-4">Zona Actual</Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{account.cliente?.codigo_cliente || account.cliente?.tipo || '-'}</span>
                            {(account.zona_nombre || account.ruta_nombre) && (
                              <span className="text-[11px] text-muted-foreground/80">
                                • {account.zona_nombre} ({account.ruta_nombre})
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="text-xs font-medium">
                          {account.venta?.fecha ? format(new Date(typeof account.venta.fecha === 'string' ? account.venta.fecha.substring(0, 10) + "T00:00:00" : account.venta.fecha), "dd/MM/yyyy") : '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        S/ {Number(account.monto_total).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium whitespace-nowrap">
                        S/ {Number(account.monto_pagado).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold whitespace-nowrap">
                        S/ {Number(account.saldo).toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div>
                          {account.fecha_vencimiento ? (
                            <p className="text-sm font-medium">
                              {format(new Date(typeof account.fecha_vencimiento === 'string' ? account.fecha_vencimiento.substring(0, 10) + "T00:00:00" : account.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sin fecha establecida</p>
                          )}
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {daysInfo.diasPlazo > 0 && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                Plazo: {daysInfo.diasPlazo} días
                              </span>
                            )}
                            {account.fecha_vencimiento && !isPaid && (
                              <span className={`text-xs ${daysInfo.isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                {daysInfo.text}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{getStatusBadge(account.estado)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2 items-center">
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleVerPagos(account)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Pagos
                          </Button>
                          <Button
                            size="sm"
                            className="bg-gradient-warm hover:opacity-90"
                            disabled={isPaid}
                            onClick={() => { setSelectedAccount(account); setIsDialogOpen(true); }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Cobrar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Cobrar Dialog */}
      <Dialog open={isDialogOpen && !!selectedAccount} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setSelectedAccount(null); }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Registrar Pago / Cobranza</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Cliente: {selectedAccount?.cliente?.razon_social}
              <br />
              Saldo pendiente: S/ {Number(selectedAccount?.saldo).toLocaleString()}
              {(() => {
                const info = getDaysInfo(selectedAccount);
                return info.diasPlazo > 0 ? ` — Plazo: ${info.diasPlazo} días` : '';
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label htmlFor="payment-date">Fecha de Pago / Cobranza</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-primary font-medium hover:bg-primary/10 h-7"
              onClick={() => {
                const nextState = !isSplitPay;
                setIsSplitPay(nextState);
                if (nextState && splitPayRows.length === 0) {
                  const initialMonto = parseFloat(paymentAmount) || (selectedAccount ? Number(selectedAccount.saldo) : 0);
                  setSplitPayRows([
                    { metodo_pago: payMethod || 'EFECTIVO', monto: initialMonto }
                  ]);
                }
              }}
            >
              {isSplitPay ? '← Usar pago único' : '🔀 Dividir pago (Múltiples Métodos)'}
            </Button>
          </div>

          {!isSplitPay ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto a pagar (S/)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={Number(selectedAccount?.saldo)}
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="YAPE">Yape</SelectItem>
                    <SelectItem value="PLIN">Plin</SelectItem>
                    <SelectItem value="DEPOSITO">Depósito Bancario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payMethod === 'DEPOSITO' && (
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="space-y-2">
                    <Label>Banco donde se paga <span className="text-red-500">*</span></Label>
                    <Select value={bank} onValueChange={setBank}>
                      <SelectTrigger><SelectValue placeholder="Selecciona un banco" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BCP">BCP (Banco de Crédito)</SelectItem>
                        <SelectItem value="BBVA">BBVA</SelectItem>
                        <SelectItem value="Interbank">Interbank</SelectItem>
                        <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                        <SelectItem value="Banco de la Nacion">Banco de la Nación</SelectItem>
                        <SelectItem value="BanBif">BanBif</SelectItem>
                        <SelectItem value="Otro">Otro Banco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Operación <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Ej: 00482910"
                      value={operationNumber}
                      onChange={(e) => setOperationNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>Desglose de Pagos</span>
                <span className="text-primary">
                  Suma: S/ {splitPayRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0).toFixed(2)}
                </span>
              </div>

              {splitPayRows.map((row, idx) => (
                <div key={idx} className="p-2.5 bg-muted/40 rounded-lg border space-y-2 text-xs">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <Select
                      value={row.metodo_pago}
                      onValueChange={(val) => {
                        const newRows = [...splitPayRows];
                        newRows[idx].metodo_pago = val;
                        setSplitPayRows(newRows);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1 min-w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                        <SelectItem value="YAPE">Yape</SelectItem>
                        <SelectItem value="PLIN">Plin</SelectItem>
                        <SelectItem value="DEPOSITO">Depósito</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 w-full sm:w-28 shrink-0">
                      <span>S/</span>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={row.monto || ''}
                        onChange={(e) => {
                          const newRows = [...splitPayRows];
                          newRows[idx].monto = parseFloat(e.target.value) || 0;
                          setSplitPayRows(newRows);
                        }}
                        className="h-8 text-xs flex-1"
                      />
                      {splitPayRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => setSplitPayRows(splitPayRows.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {row.metodo_pago === 'DEPOSITO' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Input
                        placeholder="Banco"
                        value={row.banco || ''}
                        onChange={(e) => {
                          const newRows = [...splitPayRows];
                          newRows[idx].banco = e.target.value;
                          setSplitPayRows(newRows);
                        }}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="N° Operación"
                        value={row.numero_operacion || ''}
                        onChange={(e) => {
                          const newRows = [...splitPayRows];
                          newRows[idx].numero_operacion = e.target.value;
                          setSplitPayRows(newRows);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1"
                onClick={() => setSplitPayRows([...splitPayRows, { metodo_pago: 'EFECTIVO', monto: 0 }])}
              >
                <Plus className="h-3 w-3" /> Agregar otro pago
              </Button>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-gradient-warm hover:opacity-90 w-full sm:w-auto"
              onClick={() => handlePayment(selectedAccount?.id)}
              disabled={
                isSplitPay
                  ? splitPayRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0) <= 0
                  : !paymentAmount || (payMethod === 'DEPOSITO' && (!bank || !operationNumber))
              }
            >
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ver Pagos Dialog */}
      <Dialog open={!!pagosDialog} onOpenChange={() => setPagosDialog(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[600px] p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <DialogTitle className="text-lg sm:text-xl">Detalle de Pagos</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Cliente: {pagosDialog?.cliente?.razon_social}
                </DialogDescription>
              </div>
              {pagosDialog?.venta && (
                <Badge variant="outline" className="bg-primary/5 text-xs">
                  Fecha Venta: {format(new Date(pagosDialog.venta.fecha), "dd/MM/yyyy")}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="py-4">
            {loadingPagos ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : cuentaPagos.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No hay pagos registrados</p>
            ) : (
              <div className="overflow-x-auto w-full border rounded-lg">
                <Table className="w-full min-w-[500px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentaPagos.map((pago: any) => {
                      const isAnulado = pago.estado === 'ANULADO';
                      const isAdelanto = String(pago.id).startsWith('adelanto-') || pago.metodo_pago === 'ADELANTO';
                      return (
                        <TableRow key={pago.id} className={isAnulado ? 'bg-destructive/5 opacity-70' : ''}>
                          <TableCell className="whitespace-nowrap">{format(new Date(typeof pago.fecha === 'string' ? pago.fecha.substring(0, 10) + "T00:00:00" : pago.fecha), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="capitalize whitespace-nowrap">{pago.metodo_pago}</TableCell>
                          <TableCell className={`text-right font-bold whitespace-nowrap ${isAnulado ? 'line-through text-muted-foreground' : 'text-emerald-600'}`}>
                            S/ {Number(pago.monto).toFixed(2)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{pago.referencia || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant={isAnulado ? 'destructive' : isAdelanto ? 'outline' : 'secondary'}>
                              {isAnulado ? 'ANULADO' : isAdelanto ? 'ADELANTO' : 'ACTIVO'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {!isAdelanto && !isAnulado ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                onClick={() => setAnularDialog(pago)}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Anular
                              </Button>
                            ) : isAnulado ? (
                              <span className="text-xs text-muted-foreground italic">Anulado</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic" title="No se puede anular un adelanto de crédito">Adelanto (No anulable)</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPagosDialog(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Annul Abono Confirmation Dialog */}
      <Dialog open={!!anularDialog} onOpenChange={(open) => { if (!open) setAnularDialog(null); }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-destructive text-lg flex items-center gap-2">
              <Ban className="h-5 w-5" /> Confirmar Anulación de Abono
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2 text-xs sm:text-sm">
              ¿Estás seguro de que deseas anular este abono de <strong>S/ {Number(anularDialog?.monto || 0).toFixed(2)}</strong> ({anularDialog?.metodo_pago})?
              <br /><br />
              <span className="text-xs text-muted-foreground block">
                Esto restaurará el saldo pendiente de la cuenta por cobrar y registrará un egreso de ajuste en caja.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAnularDialog(null)} disabled={isAnulling}>
              Cancelar
            </Button>
            <Button variant="destructive" className="w-full sm:w-auto" onClick={handleAnularAbono} disabled={isAnulling}>
              {isAnulling ? 'Anulando...' : 'Anular Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsReceivable;
