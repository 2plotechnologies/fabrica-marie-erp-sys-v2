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
import { Search, CreditCard, DollarSign, AlertTriangle, Clock, Filter, CheckCircle, Loader2, Eye } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const [pagosDialog, setPagosDialog] = useState<any>(null);
  const [cuentaPagos, setCuentaPagos] = useState<any[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

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

  const filteredAccounts = cuentas.filter((account) => {
    const matchesSearch = account.cliente?.razon_social
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || account.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);

  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDIENTE: { variant: 'secondary', label: 'PENDIENTE' },
      PARCIAL: { variant: 'outline', label: 'PARCIAL' },
      PAGADA: { variant: 'default', label: 'PAGADO' },
      VENCIDA: { variant: 'destructive', label: 'VENCIDO' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysInfo = (dueDate: Date) => {
    if (!dueDate) {
      return { text: 'Sin fecha de vencimiento establecida', isOverdue: false };
    }
    const days = differenceInDays(dueDate, new Date());
    if (days < 0) {
      return { text: `${Math.abs(days)} días vencido`, isOverdue: true };
    } else if (days === 0) {
      return { text: 'Vence hoy', isOverdue: false };
    } else {
      return { text: `${days} días restantes`, isOverdue: false };
    }
  };

  const handlePayment = async (id) => {

    try {
      await cobranzasService.registrarAbono(id, {
        fecha: new Date().toISOString().split('T')[0],
        monto: Number(paymentAmount),
        metodo_pago: payMethod,
      });
      fetchCuentas();
      setIsDialogOpen(false);
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear abono', error, 'No se pudo crear el abono.'));
    }
    setPaymentAmount('');
  };

  const totalPending = cuentas
    .filter(a => a.estado !== 'PAGADO')
    .reduce((acc, a) => acc + Number(a.monto_pagado), 0);

  const totalOverdue = cuentas
    .filter(a => a.estado === 'VENCIDO')
    .reduce((acc, a) => acc + Number(a.saldo), 0);

  const totalPartial = cuentas
    .filter(a => a.estado === 'PARCIAL')
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
                  {cuentas.filter(a => a.estado !== 'PAGADO').length}
                </p>
              </div>
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
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="VENCIDO">Vencida</SelectItem>
                <SelectItem value="PAGADO">Pagada</SelectItem>
              </SelectContent>
            </Select>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
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
                const daysInfo = getDaysInfo(account.fecha_vencimiento);
                return (
                  <TableRow key={account.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.cliente?.razon_social}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.cliente?.tipo}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      S/ {Number(account.monto_total).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      S/ {Number(account.monto_pagado).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      S/ {Number(account.saldo).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        {account.fecha_vencimiento && (
                          <p className="text-sm">
                            {format(account.fecha_vencimiento, "dd MMM yyyy", { locale: es })}
                          </p>
                        )}
                        {!account.fecha_vencimiento && (
                          <p className="text-sm">Sin fecha de vencimiento establecida</p>
                        )}
                        {account.fecha_vencimiento && (
                          <p className={`text-xs ${daysInfo.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {daysInfo.text}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(account.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleVerPagos(account)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Pagos
                        </Button>
                        {/* Deshabilitar si el estado es PAGADO */}
                        <Dialog open={selectedAccount?.id === account.id && isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); setSelectedAccount(open ? account : null); }}>
                          <DialogTrigger asChild>
                          <Button size="sm" className="bg-gradient-warm hover:opacity-90" disabled={account.estado === 'PAGADO'}>
                            <DollarSign className="h-4 w-4 mr-1" />
                            Cobrar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Pago</DialogTitle>
                            <DialogDescription>
                              Cliente: {selectedAccount?.cliente?.razon_social}
                              <br />
                              Saldo pendiente: S/ {Number(selectedAccount?.saldo).toLocaleString()}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
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
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancelar</Button>
                            <Button
                              className="bg-gradient-warm hover:opacity-90"
                              onClick={() => handlePayment(selectedAccount.id)}>
                              Confirmar Pago
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {/* Ver Pagos Dialog */}
      <Dialog open={!!pagosDialog} onOpenChange={() => setPagosDialog(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>Detalle de Pagos</DialogTitle>
                <DialogDescription>
                  Cliente: {pagosDialog?.cliente?.razon_social}
                </DialogDescription>
              </div>
              {pagosDialog?.venta && (
                <Badge variant="outline" className="bg-primary/5 mt-1 text-xs">
                  Fecha Venta: {format(new Date(pagosDialog.venta.fecha), "dd/MM/yyyy")}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="py-4">
            {loadingPagos ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : cuentaPagos.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay pagos registrados</p>
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
                  {cuentaPagos.map((pago: any) => (
                    <TableRow key={pago.id}>
                      <TableCell>{format(new Date(pago.fecha), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="capitalize">{pago.metodo_pago}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-bold">S/ {Number(pago.monto).toLocaleString()}</TableCell>
                      <TableCell>{pago.referencia || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagosDialog(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsReceivable;
