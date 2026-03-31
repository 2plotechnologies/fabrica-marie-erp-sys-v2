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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown, Search, DollarSign, Users, Clock, Loader2, CreditCard, CalendarPlus, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { cobranzasService } from '@/services/cobranzasService';
import { formatErrorMessage } from '@/lib/axios-error';

const CollectionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);

  // Payment dialog
  const [payDialog, setPayDialog] = useState<{ cuentaId: string; saldo: number; clienteName: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFECTIVO');

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

  const handlePay = async () => {
    if (!payDialog || !payAmount) return;
    try {
      await cobranzasService.registrarAbono(payDialog.cuentaId, {
        fecha: new Date().toISOString().split('T')[0],
        monto: parseFloat(payAmount),
        metodo_pago: payMethod,
      });
      setPayDialog(null);
      fetchCuentas();
      fetchPagos();
      setPayAmount('');
    } catch (error) {
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
      (c.venta?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
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
                    <TableHead>Codigo de Venta</TableHead>
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
                          <p className="text-xs text-muted-foreground">{cuenta.venta.codigo}</p>
                        </TableCell>
                        <TableCell className="text-right">S/ {Number(cuenta.monto_total).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">S/ {Number(cuenta.monto_pagado).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">S/ {Number(cuenta.saldo).toLocaleString()}</TableCell>
                        {cuenta.fecha_vencimiento && (
                          <TableCell className="text-sm">{format(new Date(cuenta.fecha_vencimiento), "dd/MM/yyyy")}</TableCell>
                        )}
                        {!cuenta.fecha_vencimiento && (
                          <TableCell className="text-sm">Sin fecha de vencimiento establecida</TableCell>
                        )}
                        <TableCell>{getEstadoBadge(cuenta.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            <Button
                              size="sm"
                              className="bg-gradient-warm hover:opacity-90"
                              disabled={cuenta.estado === 'PAGADO'}
                              onClick={() => setPayDialog({ cuentaId: cuenta.id, saldo: Number(cuenta.saldo), clienteName: cuenta.cliente?.razon_social || '' })}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />Pagar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={cuenta.estado === 'PAGADO'}
                              onClick={() => setPayDialog({ cuentaId: cuenta.id, saldo: Number(cuenta.saldo), clienteName: cuenta.cliente?.razon_social || '' })}
                            >
                              <Coins className="h-3 w-3 mr-1" />Amortizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={cuenta.estado === 'PAGADO'}
                              onClick={() => setExtendDialog({ cuentaId: cuenta.id, currentDate: cuenta.fecha_vencimiento || format(new Date(), "yyyy-MM-dd") })}
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
                            <TableCell>{format(new Date(pago.fecha), "dd/MM/yyyy")}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Cliente: {payDialog?.clienteName} — Saldo: S/ {payDialog?.saldo.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button className="bg-gradient-warm hover:opacity-90" onClick={handlePay} disabled={!payAmount}>
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
              Fecha actual: {extendDialog ? format(new Date(extendDialog.currentDate), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}
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
