import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Plus, ReceiptText, Trash2, Lock, Truck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { gastoService } from '@/services/gastoService';
import { salidaService } from '@/services/salidaService';
import { formatErrorMessage } from '@/lib/axios-error';

const ExpenseList = () => {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === 'VENDEDOR';

  const [gastos, setGastos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [salidas, setSalidas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCajaCerradaModalOpen, setIsCajaCerradaModalOpen] = useState(false);

  // Delete State
  const [deleteConfirmGasto, setDeleteConfirmGasto] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formVendedor, setFormVendedor] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [formComprobante, setFormComprobante] = useState('');
  const [formTipoComprobante, setFormTipoComprobante] = useState('');
  const [formTipo, setFormTipo] = useState('');
  const [formFecha, setFormFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [gastosData, vendedoresData, salidasData] = await Promise.all([
        gastoService.getGastos(),
        gastoService.getVendedores(),
        salidaService.getAll().catch(() => []),
      ]);
      setGastos(gastosData);
      setVendedores(vendedoresData);
      setSalidas(salidasData);
    } catch (error: any) {
      toast.error(formatErrorMessage('Error al cargar datos', error, 'No se pudieron cargar los datos.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const vendedorActual = vendedores.find(v => v.usuario_id === user?.id);

  useEffect(() => {
    if (isVendedor && vendedorActual) {
      setFormVendedor(String(vendedorActual.id));
    }
  }, [isVendedor, vendedorActual, dialogOpen]);

  const resetForm = () => {
    setFormVendedor(isVendedor && vendedorActual ? String(vendedorActual.id) : '');
    setFormMonto('');
    setFormComprobante('');
    setFormTipoComprobante('');
    setFormTipo('');
    setFormFecha(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = async () => {
    if (!formVendedor || !formMonto || !formTipo || !formFecha || !formTipoComprobante) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      await gastoService.createGasto({
        vendedor_id: Number(formVendedor),
        monto: Number(formMonto),
        comprobante: formComprobante || undefined,
        tipo_comprobante: formTipoComprobante,
        tipo: formTipo,
        fecha: formFecha,
      });

      await loadData();
      resetForm();
      setDialogOpen(false);
      toast.success('Gasto registrado con éxito');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '';
      const isCajaCerrada = error.response?.status === 403 &&
        (errorMessage.toLowerCase().includes('caja abierta') ||
          errorMessage.toLowerCase().includes('caja cerrada'));

      if (isCajaCerrada) {
        setDialogOpen(false);
        setIsCajaCerradaModalOpen(true);
      } else {
        toast.error(formatErrorMessage('Error al crear gasto', error, 'No se pudo crear el gasto.'));
      }
    }
  };

  const handleDeleteGasto = async () => {
    if (!deleteConfirmGasto) return;
    try {
      setIsDeleting(true);
      await gastoService.deleteGasto(deleteConfirmGasto.id);
      toast.success('Gasto eliminado con éxito');
      await loadData();
      setDeleteConfirmGasto(null);
    } catch (error: any) {
      toast.error(formatErrorMessage('Error al eliminar gasto', error, 'Solo se pueden eliminar gastos en estado PENDIENTE.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const itemsPerPage = 6;

  // Paginación general para vista unificada (No Vendedores: Admin, Gerente, etc.).
  const [pageAll, setPageAll] = useState(1);
  const totalPagesAll = Math.ceil(gastos.length / itemsPerPage) || 1;
  const paginatedGastosAll = gastos.slice(
    (pageAll - 1) * itemsPerPage,
    pageAll * itemsPerPage
  );

  // Mapa de salidas exclusivamente en estado EN_RUTA por vendedor_id.
  const salidasEnRutaMap = useMemo(() => {
    const map = new Map<number, any>();
    if (Array.isArray(salidas)) {
      salidas.forEach(s => {
        const estadoUpper = (s.estado || '').toUpperCase();
        if (estadoUpper === 'EN_RUTA' || estadoUpper === 'EN RUTA') {
          if (!map.has(s.vendedor_id)) {
            map.set(s.vendedor_id, s);
          }
        }
      });
    }
    return map;
  }, [salidas]);

  // Clasificación de gastos (Exclusivo VENDEDOR): Gastos de la salida en ruta actual vs Gastos anteriores
  const { gastosSalidaActual, gastosAnteriores } = useMemo(() => {
    const enRuta: any[] = [];
    const anteriores: any[] = [];

    gastos.forEach(gasto => {
      const vendedorId = gasto.vendedor_id;
      const activeSalida = salidasEnRutaMap.get(vendedorId);

      if (activeSalida) {
        const gastoFecha = gasto.fecha;
        const salidaFecha = activeSalida.fecha;
        const resumenSalida = gasto.resumen_diario?.salida;
        const resumenSalidaEstado = resumenSalida?.estado ? String(resumenSalida.estado).toUpperCase() : null;

        const esDeSalidaActual =
          gasto.resumen_diario?.salida_id === activeSalida.id ||
          (gastoFecha >= salidaFecha && (!resumenSalidaEstado || resumenSalidaEstado === 'EN_RUTA' || resumenSalidaEstado === 'EN RUTA'));

        if (esDeSalidaActual) {
          enRuta.push(gasto);
        } else {
          anteriores.push(gasto);
        }
      } else {
        anteriores.push(gasto);
      }
    });

    return { gastosSalidaActual: enRuta, gastosAnteriores: anteriores };
  }, [gastos, salidasEnRutaMap]);

  const totalSalidaActual = useMemo(() => {
    return gastosSalidaActual.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  }, [gastosSalidaActual]);

  const totalGastosAnteriores = useMemo(() => {
    return gastosAnteriores.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  }, [gastosAnteriores]);

  // Paginación para Gastos Anteriores en vista vendedor
  const [pageAnteriores, setPageAnteriores] = useState(1);
  const totalPagesAnteriores = Math.ceil(gastosAnteriores.length / itemsPerPage) || 1;

  const paginatedGastosAnteriores = gastosAnteriores.slice(
    (pageAnteriores - 1) * itemsPerPage,
    pageAnteriores * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de gastos registrados por vendedores
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Gasto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vendedor *</Label>
                <Select value={formVendedor} onValueChange={setFormVendedor} disabled={isVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.usuario?.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Monto (S/) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formTipo}
                  onValueChange={(v) => setFormTipo(v)}
                >
                  <SelectTrigger className="col-span-4">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gerencia">Gerencia</SelectItem>
                    <SelectItem value="productora">Productora</SelectItem>
                    <SelectItem value="distribuidora">Distribuidora</SelectItem>
                    <SelectItem value="descripcion_general">Descripción General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo Comprobante *</Label>
                <Select
                  value={formTipoComprobante}
                  onValueChange={(v) => setFormTipoComprobante(v)}
                >
                  <SelectTrigger className="col-span-4">
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

              <div>
                <Label>Comprobante / Referencia</Label>
                <Input
                  placeholder="Número de boleta, serie, etc."
                  value={formComprobante}
                  onChange={(e) => setFormComprobante(e.target.value)}
                />
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button variant="gradient" onClick={handleSubmit} disabled={!formVendedor || !formMonto || !formTipo || !formFecha || !formTipoComprobante}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!isVendedor ? (
        /* VISTA UNIFICADA PARA ADMINISTRADORES / GERENTES / OTROS ROLES */
        <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tipo Comprobante</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : gastos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No hay gastos registrados
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGastosAll.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {format(new Date(g.fecha + 'T00:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{g.vendedor?.usuario?.nombre ?? '—'}</TableCell>
                    <TableCell>{g.tipo}</TableCell>
                    <TableCell>{g.tipo_comprobante || 'Otro/Ninguno'}</TableCell>
                    <TableCell>{g.comprobante || '—'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      S/ {Number(g.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.estado === 'APROBADO' ? 'default' : g.estado === 'RECHAZADO' ? 'destructive' : 'secondary'}>
                        {g.estado || 'PENDIENTE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(!g.estado || g.estado === 'PENDIENTE') ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmGasto(g)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No eliminable</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPagesAll > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={pageAll === 1}
                onClick={() => setPageAll(pageAll - 1)}
              >
                Anterior
              </Button>

              <span className="px-3 py-1 text-sm flex items-center">
                Página {pageAll} de {totalPagesAll}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pageAll === totalPagesAll}
                onClick={() => setPageAll(pageAll + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* VISTA SEPARADA EXCLUSIVA PARA VENDEDORES */
        <div className="space-y-6">
          {/* SECCIÓN 1: Gastos de la salida en ruta actual */}
          <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up space-y-0">
            <div className="p-4 sm:p-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-semibold">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display flex items-center gap-2">
                    Gastos de la salida en ruta actual
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Gastos registrados durante la salida en ruta activa
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs px-3 py-1 font-semibold">
                  {gastosSalidaActual.length} {gastosSalidaActual.length === 1 ? 'gasto' : 'gastos'} • Total: S/ {totalSalidaActual.toFixed(2)}
                </Badge>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tipo Comprobante</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : gastosSalidaActual.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No hay gastos registrados en la salida en ruta actual
                    </TableCell>
                  </TableRow>
                ) : (
                  gastosSalidaActual.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        {format(new Date(g.fecha + 'T00:00:00'), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{g.vendedor?.usuario?.nombre ?? '—'}</TableCell>
                      <TableCell>{g.tipo}</TableCell>
                      <TableCell>{g.tipo_comprobante || 'Otro/Ninguno'}</TableCell>
                      <TableCell>{g.comprobante || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        S/ {Number(g.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.estado === 'APROBADO' ? 'default' : g.estado === 'RECHAZADO' ? 'destructive' : 'secondary'}>
                          {g.estado || 'PENDIENTE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(!g.estado || g.estado === 'PENDIENTE') ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmGasto(g)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No eliminable</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* SECCIÓN 2: Gastos anteriores */}
          <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up space-y-0">
            <div className="p-4 sm:p-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-semibold">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display flex items-center gap-2">
                    Gastos anteriores
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Histórico de gastos de salidas finalizadas o previas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold">
                  {gastosAnteriores.length} {gastosAnteriores.length === 1 ? 'gasto' : 'gastos'} • Total: S/ {totalGastosAnteriores.toFixed(2)}
                </Badge>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tipo Comprobante</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : gastosAnteriores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No hay gastos anteriores registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedGastosAnteriores.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        {format(new Date(g.fecha + 'T00:00:00'), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{g.vendedor?.usuario?.nombre ?? '—'}</TableCell>
                      <TableCell>{g.tipo}</TableCell>
                      <TableCell>{g.tipo_comprobante || 'Otro/Ninguno'}</TableCell>
                      <TableCell>{g.comprobante || '—'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        S/ {Number(g.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.estado === 'APROBADO' ? 'default' : g.estado === 'RECHAZADO' ? 'destructive' : 'secondary'}>
                          {g.estado || 'PENDIENTE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(!g.estado || g.estado === 'PENDIENTE') ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmGasto(g)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No eliminable</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPagesAnteriores > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageAnteriores === 1}
                  onClick={() => setPageAnteriores(pageAnteriores - 1)}
                >
                  Anterior
                </Button>

                <span className="px-3 py-1 text-sm flex items-center">
                  Página {pageAnteriores} de {totalPagesAnteriores}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageAnteriores === totalPagesAnteriores}
                  onClick={() => setPageAnteriores(pageAnteriores + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Expense Deletion */}
      <Dialog open={!!deleteConfirmGasto} onOpenChange={(open) => { if (!open) setDeleteConfirmGasto(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirmar Eliminación de Gasto
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              ¿Estás seguro de que deseas eliminar este gasto de <strong>S/ {Number(deleteConfirmGasto?.monto || 0).toFixed(2)}</strong> ({deleteConfirmGasto?.tipo}) registrado por <strong>{deleteConfirmGasto?.vendedor?.usuario?.nombre || 'el vendedor'}</strong>?
              <br />
              <span className="text-xs text-muted-foreground">Esta acción no se puede deshacer.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmGasto(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteGasto} disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Caja Cerrada */}
      <Dialog open={isCajaCerradaModalOpen} onOpenChange={setIsCajaCerradaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 animate-bounce">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold font-display text-red-600 dark:text-red-400">
              Apertura de Caja Requerida
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-2">
              No se ha detectado una caja abierta para el día de hoy. Es indispensable contar con una caja abierta antes de registrar gastos.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-center">
            {isVendedor ? (
              <div className="bg-muted p-4 rounded-lg text-sm font-medium border border-border text-left">
                Por favor, solicite a un <span className="text-primary font-bold">administrador, gerente, supervisor o cajero</span> que aperture la caja para continuar.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Como usuario administrador o de gestión, puede proceder a realizar la apertura de caja directamente en la vista de caja.
              </p>
            )}
          </div>

          <DialogFooter className="flex sm:justify-center gap-2">
            {isVendedor ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsCajaCerradaModalOpen(false)}
              >
                Entendido
              </Button>
            ) : (
              <div className="flex w-full gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCajaCerradaModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="gradient"
                  className="gap-2"
                  onClick={() => {
                    setIsCajaCerradaModalOpen(false);
                    navigate('/caja');
                  }}
                >
                  Ir a la Vista de Caja
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseList;
