import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown, Search, DollarSign, Users, Clock, Loader2, CreditCard, CalendarPlus, Coins, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cobranzasService } from '@/services/cobranzasService';
import { formatErrorMessage } from '@/lib/axios-error';

const CollectionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);

  // Payment dialog
  const [payDialog, setPayDialog] = useState<{ cuentaId: string; saldo: number; clienteName: string; diasPlazo?: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [bank, setBank] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [isSplitPay, setIsSplitPay] = useState(false);
  const [splitPayRows, setSplitPayRows] = useState<{ metodo_pago: string; monto: number; banco?: string; numero_operacion?: string }[]>([]);

  // Extend date dialog  
  const [extendDialog, setExtendDialog] = useState<{ cuentaId: string; currentDate: string } | null>(null);
  const [newDate, setNewDate] = useState('');

  const [cuentas, setCuentas] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchPagos = async () => {
    setIsLoading(true);
    try {
      const data = await cobranzasService.getPagosCuenta(selectedCuentaId || '');
      setPagos(data);
      console.log(data);
    } catch (error) {
      console.error('Error fetching pagos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCuentaId) {
      fetchPagos();
    }
  }, [selectedCuentaId]);

  useEffect(() => {
    fetchCuentas();
    fetchVendedores();
  }, []);

  const calculateAmortizationDays = (cuenta: any) => {
    if (!cuenta) return { diasPlazo: 0, textRestantes: '', isOverdue: false };
    let diasPlazo = cuenta.cliente?.dias_credito || 0;
    if (!diasPlazo && cuenta.fecha_vencimiento && cuenta.venta?.fecha) {
      const start = new Date(cuenta.venta.fecha.substring(0, 10) + "T00:00:00");
      const end = new Date(cuenta.fecha_vencimiento.substring(0, 10) + "T00:00:00");
      diasPlazo = Math.max(0, differenceInDays(end, start));
    }

    let textRestantes = '';
    let isOverdue = false;

    if (cuenta.fecha_vencimiento) {
      const dueDate = new Date(cuenta.fecha_vencimiento.substring(0, 10) + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = differenceInDays(dueDate, today);

      if (days < 0) {
        isOverdue = true;
        textRestantes = `${Math.abs(days)} días vencido`;
      } else if (days === 0) {
        textRestantes = 'Vence hoy';
      } else {
        textRestantes = `${days} días restantes`;
      }
    }

    return { diasPlazo, textRestantes, isOverdue };
  };

  const handlePay = async () => {
    if (!payDialog) return;

    if (isSplitPay) {
      const totalSplit = splitPayRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
      if (totalSplit <= 0) {
        toast.error('Ingrese al menos un monto mayor a cero.');
        return;
      }
      if (totalSplit > payDialog.saldo) {
        toast.error(`El monto total de pago (S/ ${totalSplit.toFixed(2)}) supera el saldo pendiente (S/ ${payDialog.saldo.toFixed(2)}).`);
        return;
      }

      try {
        await cobranzasService.registrarAbono(payDialog.cuentaId, {
          pagos: splitPayRows
        });
        toast.success('Abonos registrados correctamente');
        setPayDialog(null);
        setIsSplitPay(false);
        setSplitPayRows([]);
        fetchCuentas();
        fetchPagos();
      } catch (error: any) {
        console.log("ERROR COMPLETO:", error);
        console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
        toast.error(formatErrorMessage('Error al crear abonos', error, 'No se pudieron crear los abonos.'));
      }
      return;
    }

    if (!payAmount) return;
    if (payMethod === 'DEPOSITO') {
      if (!bank.trim() || !operationNumber.trim()) {
        toast.error('Por favor ingresa el banco y el número de operación para depósitos.');
        return;
      }
    }
    try {
      await cobranzasService.registrarAbono(payDialog.cuentaId, {
        fecha: format(new Date(), 'yyyy-MM-dd'),
        monto: parseFloat(payAmount),
        metodo_pago: payMethod,
        banco: payMethod === 'DEPOSITO' ? bank : undefined,
        numero_operacion: payMethod === 'DEPOSITO' ? operationNumber : undefined,
      });
      toast.success('Abono registrado correctamente');
      setPayDialog(null);
      fetchCuentas();
      fetchPagos();
      setPayAmount('');
      setBank('');
      setOperationNumber('');
    } catch (error: any) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear abono', error, 'No se pudo crear el abono.'));
    }
  };

  const handleExtendDate = async () => {
    if (!extendDialog || !newDate) return;
    try {
      await cobranzasService.fechaVencimiento(extendDialog.cuentaId, newDate);
      setExtendDialog(null);
      fetchCuentas();
      setExtendDialog(null);
      setNewDate('');
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al extender fecha de vencimiento', error, 'No se pudo extender la fecha.'));
    }
  };

  const filteredCuentas = cuentas.filter(c => {
    const matchesSearch =
      (c.cliente?.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (c.venta?.nota_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesVendedor = filterVendedor === 'all' || c.venta.vendedor_id === filterVendedor;
    return matchesSearch && matchesVendedor;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredCuentas.length / itemsPerPage);

  const paginatedCuentas = filteredCuentas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalDeuda = filteredCuentas.reduce((acc, c) => acc + Number(c.saldo), 0);
  const totalCobrado = filteredCuentas.reduce((acc, c) => acc + Number(c.monto_pagado), 0);
  const cuentasActivas = filteredCuentas.filter(c => c.estado !== 'PAGADO').length;

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pendiente: { variant: 'secondary', label: 'PENDIENTE' },
      parcial: { variant: 'outline', label: 'PARCIAL' },
      pagado: { variant: 'default', label: 'PAGADO' },
      vencido: { variant: 'destructive', label: 'VENCIDO' },
    };
    const config = variants[estado] || { variant: 'outline', label: estado };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Cobranzas</h1>
          <p className="text-muted-foreground">Historial de cobranzas y pagos de clientes</p>
        </div>
        <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Exportar</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="h-6 w-6 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Total Cobrado</p><p className="text-2xl font-bold text-foreground">S/ {totalCobrado.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Clock className="h-6 w-6 text-amber-600" /></div>
              <div><p className="text-sm text-muted-foreground">Pendiente</p><p className="text-2xl font-bold text-foreground">S/ {totalDeuda.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Users className="h-6 w-6 text-blue-600" /></div>
              <div><p className="text-sm text-muted-foreground">Cuentas Activas</p><p className="text-2xl font-bold text-foreground">{cuentasActivas}</p></div>
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
              <Input placeholder="Buscar por cliente o nota de venta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterVendedor} onValueChange={setFilterVendedor}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {vendedores.map(v => (<SelectItem key={v.id} value={v.id}>{v.usuario.nombre}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="historial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historial">Historial de Cobranzas</TabsTrigger>
          <TabsTrigger value="detalle">Detalle de Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="historial">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Cuentas y Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nota Pedido</TableHead>
                    <TableHead className="text-right">Monto Original</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCuentas.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay cobranzas registradas</TableCell></TableRow>
                  ) : (
                    paginatedCuentas.map((cuenta) => (
                      <TableRow key={cuenta.id} className="hover:bg-muted/50">
                        <TableCell>
                          <p className="font-medium">{cuenta.cliente?.razon_social}</p>
                          <p className="text-xs text-muted-foreground">{cuenta.cliente?.codigo_cliente}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">{cuenta.venta.nota_pedido ? cuenta.venta.nota_pedido : '-'}</p>
                        </TableCell>
                        <TableCell className="text-right">S/ {Number(cuenta.monto_total).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">S/ {Number(cuenta.monto_pagado).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">S/ {Number(cuenta.saldo).toLocaleString()}</TableCell>
                        <TableCell>
                          {(() => {
                            const { diasPlazo, textRestantes, isOverdue } = calculateAmortizationDays(cuenta);
                            return (
                              <div>
                                {cuenta.fecha_vencimiento ? (
                                  <p className="text-sm font-medium">{format(new Date(cuenta.fecha_vencimiento.substring(0, 10) + "T00:00:00"), "dd/MM/yyyy")}</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Sin fecha establecida</p>
                                )}
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {diasPlazo > 0 && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                      Plazo: {diasPlazo} días
                                    </span>
                                  )}
                                  {cuenta.fecha_vencimiento && cuenta.estado !== 'PAGADO' && textRestantes && (
                                    <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                      {textRestantes}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>{getEstadoBadge(cuenta.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            <Button
                              size="sm"
                              className="bg-gradient-warm hover:opacity-90"
                              disabled={cuenta.estado === 'PAGADO'}
                              onClick={() => {
                                const { diasPlazo } = calculateAmortizationDays(cuenta);
                                setPayDialog({ cuentaId: cuenta.id, saldo: Number(cuenta.saldo), clienteName: cuenta.cliente?.razon_social || '', diasPlazo });
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />Pagar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={cuenta.estado === 'PAGADO'}
                              onClick={() => {
                                const { diasPlazo } = calculateAmortizationDays(cuenta);
                                setPayDialog({ cuentaId: cuenta.id, saldo: Number(cuenta.saldo), clienteName: cuenta.cliente?.razon_social || '', diasPlazo });
                              }}
                            >
                              <Coins className="h-3 w-3 mr-1" />Amortizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={cuenta.estado === 'PAGADO'}
                              onClick={() => setExtendDialog({ cuentaId: cuenta.id, currentDate: cuenta.fecha_vencimiento ? cuenta.fecha_vencimiento.substring(0, 10) : format(new Date(), "yyyy-MM-dd") })}
                            >
                              <CalendarPlus className="h-3 w-3 mr-1" />Extender
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedCuentaId(selectedCuentaId === cuenta.id ? null : cuenta.id)}>
                              Ver Pagos
                            </Button>
                          </div>
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
        </TabsContent>

        <TabsContent value="detalle">
          <Card className="shadow-card">
            <CardHeader><CardTitle>Selecciona una cuenta para ver los pagos</CardTitle></CardHeader>
            <CardContent>
              {selectedCuentaId ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Pagos registrados</h4>
                    {selectedCuentaId && cuentas.find(c => c.id === selectedCuentaId)?.venta && (
                      <Badge variant="outline" className="bg-primary/5">
                        Fecha de Venta: {format(new Date(cuentas.find(c => c.id === selectedCuentaId)?.venta.fecha), "dd/MM/yyyy")}
                      </Badge>
                    )}
                  </div>
                  {pagos.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay pagos registrados para esta cuenta</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Referencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagos.map(pago => (
                          <TableRow key={pago.id}>
                            <TableCell>{format(new Date(pago.fecha.substring(0, 10) + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="capitalize">{pago.metodo_pago}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">S/ {Number(pago.monto).toFixed(2)}</TableCell>
                            <TableCell>{pago.referencia || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Haz clic en "Ver Pagos" en una cuenta para ver su historial</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pay / Amortize Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago / Amortización</DialogTitle>
            <DialogDescription>
              Cliente: {payDialog?.clienteName} — Saldo: S/ {payDialog?.saldo.toLocaleString()}
              {payDialog?.diasPlazo && payDialog.diasPlazo > 0 ? ` — Plazo de amortización: ${payDialog.diasPlazo} días` : ''}
            </DialogDescription>
          </DialogHeader>

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
                  const initialMonto = parseFloat(payAmount) || (payDialog ? payDialog.saldo : 0);
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
                <Label>Monto a pagar (S/)</Label>
                <Input type="number" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} max={payDialog?.saldo} />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.metodo_pago}
                      onValueChange={(val) => {
                        const newRows = [...splitPayRows];
                        newRows[idx].metodo_pago = val;
                        setSplitPayRows(newRows);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
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

                    <div className="flex items-center gap-1 w-28">
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
                        className="h-8 text-xs"
                      />
                    </div>

                    {splitPayRows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setSplitPayRows(splitPayRows.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button
              className="bg-gradient-warm hover:opacity-90"
              onClick={handlePay}
              disabled={
                isSplitPay
                  ? splitPayRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0) <= 0
                  : !payAmount || (payMethod === 'DEPOSITO' && (!bank || !operationNumber))
              }
            >
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Date Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={() => setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender Fecha de Vencimiento</DialogTitle>
            <DialogDescription>
              {/* Si no existe un valor en extendDialog.currentDate, mostrar la fecha actual */}
              Fecha actual: {extendDialog ? format(new Date(extendDialog.currentDate.substring(0, 10) + "T00:00:00"), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nueva Fecha de Vencimiento</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={extendDialog?.currentDate || format(new Date(), "yyyy-MM-dd")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)}>Cancelar</Button>
            <Button onClick={handleExtendDate} disabled={!newDate}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionsPage;
