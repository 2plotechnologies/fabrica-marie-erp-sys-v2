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
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cajaService } from '@/services/cajaService';
import { toast } from 'sonner';

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const [cajaActual, setCajaActual] = useState<any | null>(null);
  //const [cierreActual, setCierreActual] = useState<any | null>(null);

  const movimientos = cajaActual?.movimientos ?? [];
  const saldoInicial = Number(cajaActual?.saldo_inicial) || 0;

  const isOpen = cajaActual?.estado === 'ABIERTA';
  const totalIngresos = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'EGRESO' && m.estado === 'APROBADO').reduce((acc, m) => acc + Number(m.monto), 0);
  const saldoActual = (isToday ? saldoInicial : 0) + totalIngresos - totalEgresos;

  const fetchCajaActual = async () => {
    try {
      const data = await cajaService.getCaja();
      setCajaActual(data);
      setIsLoading(true);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchCajaActual();
  }, []);

  const handleOpenCash = async () => {

    try {
      const response = await cajaService.abrirCaja({
        monto_apertura: Number(openingAmount),
      });
      console.log(response);
      await fetchCajaActual();
      toast.success("Caja abierta correctamente");
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al abrir caja: " + error.response?.data);
    }

    setIsOpenCashDialog(false);
    setOpeningAmount('');
  };

  const handleCloseCash = async () => {
    if (!cajaActual) return;
    try {
      const response = await cajaService.cerrarCaja(cajaActual.id, Number(cajaActual.saldo_actual), Number(closingCount));
      console.log(response);
      await fetchCajaActual();
      toast.success("Caja cerrada correctamente");
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al cerrar caja: " + error.response?.data);
    }
    setIsCloseCashDialog(false);
    setClosingCount('');
  };

  const handleMovement = async () => {
    if (!movCategoria || !movMonto || !movDescripcion) return;
    try {
      await cajaService.createMovimiento({
        caja_id: cajaActual.id,
        fecha: dateStr,
        tipo: movementType,
        categoria: movCategoria,
        descripcion: movDescripcion,
        monto: Number(movMonto),
      });
      setIsMovementDialog(false);
      setMovCategoria('');
      setMovMonto('');
      setMovDescripcion('');
      await fetchCajaActual();
      toast.success("Movimiento creado correctamente");
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al crear movimiento: " + error.response?.data);
    }
  };

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(movimientos.length / itemsPerPage);

  const paginatedMovimientos = movimientos.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Caja Actual</h1>
          <p className="text-muted-foreground">Control y gestión de caja del día</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(selectedDate, "dd MMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Exportar</Button>

          {isToday && isOpen ? (
            <>
              <Dialog open={isMovementDialog} onOpenChange={setIsMovementDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline"><ArrowDownCircle className="h-4 w-4 mr-2" />Movimiento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Movimiento</DialogTitle>
                    <DialogDescription>Ingresa los detalles del movimiento de caja</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tipo de Movimiento</Label>
                      <Select value={movementType} onValueChange={(v: 'ingreso' | 'egreso') => setMovementType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ingreso">Ingreso</SelectItem>
                          <SelectItem value="egreso">Egreso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={movCategoria} onValueChange={setMovCategoria}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {movementType === 'ingreso' ? (
                            <>
                              <SelectItem value="Ventas">Venta</SelectItem>
                              <SelectItem value="Cobranzas">Cobranza</SelectItem>
                              <SelectItem value="Otros">Otro Ingreso</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Gastos Operativos">Gasto Operativo</SelectItem>
                              <SelectItem value="Combustible">Combustible</SelectItem>
                              <SelectItem value="Devolución">Devolución</SelectItem>
                              <SelectItem value="Otros">Otro Egreso</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Monto (S/)</Label>
                      <Input type="number" placeholder="0.00" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea placeholder="Detalle del movimiento..." value={movDescripcion} onChange={(e) => setMovDescripcion(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMovementDialog(false)}>Cancelar</Button>
                    <Button
                      className={movementType === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                      onClick={handleMovement}
                    >
                      Registrar {movementType === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCloseCashDialog} onOpenChange={setIsCloseCashDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive"><Lock className="h-4 w-4 mr-2" />Cerrar Caja</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cerrar Caja</DialogTitle>
                    <DialogDescription>Realiza el conteo final y cierra la caja del día</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Saldo teórico:</span>
                        <span className="font-semibold">S/ {Number(saldoActual).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Conteo Real (S/)</Label>
                      <Input type="number" placeholder="0.00" value={closingCount} onChange={(e) => setClosingCount(e.target.value)} />
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
                    <Button variant="destructive" onClick={handleCloseCash}>Confirmar Cierre</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : isToday ? (
            <Dialog open={isOpenCashDialog} onOpenChange={setIsOpenCashDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-warm hover:opacity-90"><Unlock className="h-4 w-4 mr-2" />Abrir Caja</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abrir Caja</DialogTitle>
                  <DialogDescription>Ingresa el saldo inicial para abrir la caja</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Saldo Inicial (S/)</Label>
                    <Input type="number" placeholder="500.00" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpenCashDialog(false)}>Cancelar</Button>
                  <Button className="bg-gradient-warm hover:opacity-90" onClick={handleOpenCash}>Abrir Caja</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      {/* Status Card */}
      {isToday && (
        <Card className={`shadow-card ${isOpen ? 'border-emerald-200 dark:border-emerald-900/30' : 'border-gray-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <Wallet className={`h-7 w-7 ${isOpen ? 'text-emerald-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Estado de Caja</h3>
                    <Badge variant={isOpen ? 'default' : 'secondary'}>{isOpen ? 'Abierta' : 'Cerrada'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Hoy {format(new Date(), "dd MMM yyyy", { locale: es })}</p>
                </div>
              </div>
              {isOpen && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Saldo Actual</p>
                  <p className="text-3xl font-bold text-emerald-600">S/ {Number(saldoActual).toFixed(2)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isToday && (
        <Card className="shadow-card border-blue-200 dark:border-blue-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-semibold">Viendo movimientos del {format(selectedDate, "dd MMMM yyyy", { locale: es })}</h3>
                <p className="text-sm text-muted-foreground">{movimientos.length} movimientos encontrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Calculator className="h-6 w-6 text-blue-600" /></div>
              <div><p className="text-sm text-muted-foreground">Apertura</p><p className="text-xl font-bold text-foreground">S/ {(isToday ? saldoInicial : 0).toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ArrowUpCircle className="h-6 w-6 text-emerald-600" /></div>
              <div><p className="text-sm text-muted-foreground">Ingresos</p><p className="text-xl font-bold text-emerald-600">S/ {totalIngresos.toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><ArrowDownCircle className="h-6 w-6 text-red-600" /></div>
              <div><p className="text-sm text-muted-foreground">Egresos</p><p className="text-xl font-bold text-red-600">S/ {totalEgresos.toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Movimientos</p><p className="text-xl font-bold text-foreground">{movimientos.length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Movimientos {isToday ? 'del Día' : `del ${format(selectedDate, "dd/MM/yyyy")}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay movimientos {isToday ? 'hoy' : 'en esta fecha'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMovimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm">
                      {format(new Date(mov.created_at), 'dd/MM HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={mov.tipo === 'INGRESO' ? 'default' : 'destructive'}>
                        {mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </TableCell>
                    <TableCell>{mov.categoria}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.descripcion}</TableCell>
                    <TableCell className={`text-right font-bold ${mov.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'} S/ {Number(mov.monto).toFixed(2)}
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

      {isToday && !isOpen && !cajaActual && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Caja no abierta</h3>
            <p className="text-muted-foreground mb-4">Abre la caja para comenzar a registrar movimientos</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export default CurrentCash;