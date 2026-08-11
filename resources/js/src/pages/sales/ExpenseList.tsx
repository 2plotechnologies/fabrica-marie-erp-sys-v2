import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, ReceiptText, Trash2 } from 'lucide-react';
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
import { formatErrorMessage } from '@/lib/axios-error';

const ExpenseList = () => {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === 'VENDEDOR';

  const [gastos, setGastos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Delete State
  const [deleteConfirmGasto, setDeleteConfirmGasto] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formVendedor, setFormVendedor] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [formComprobante, setFormComprobante] = useState('');
  const [formTipo, setFormTipo] = useState('');
  const [formFecha, setFormFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [gastosData, vendedoresData] = await Promise.all([
          gastoService.getGastos(),
          gastoService.getVendedores(),
        ]);
        setGastos(gastosData);
        setVendedores(vendedoresData);
      } catch (error: any) {
        toast.error(formatErrorMessage('Error al cargar datos', error, 'No se pudieron cargar los datos.'));
      } finally {
        setIsLoading(false);
      }
    };
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
    setFormTipo('');
    setFormFecha(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = async () => {
    if (!formVendedor || !formMonto || !formTipo || !formFecha) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      await gastoService.createGasto({
        vendedor_id: Number(formVendedor),
        monto: Number(formMonto),
        comprobante: formComprobante || undefined,
        tipo: formTipo,
        fecha: formFecha,
      });

      const gastosData = await gastoService.getGastos();
      setGastos(gastosData);
      resetForm();
      setDialogOpen(false);
      toast.success('Gasto registrado con éxito');
    } catch (error: any) {
      toast.error(formatErrorMessage('Error al crear gasto', error, 'No se pudo crear el gasto.'));
    }
  };

  const handleDeleteGasto = async () => {
    if (!deleteConfirmGasto) return;
    try {
      setIsDeleting(true);
      await gastoService.deleteGasto(deleteConfirmGasto.id);
      toast.success('Gasto eliminado con éxito');
      const gastosData = await gastoService.getGastos();
      setGastos(gastosData);
      setDeleteConfirmGasto(null);
    } catch (error: any) {
      toast.error(formatErrorMessage('Error al eliminar gasto', error, 'Solo se pueden eliminar gastos en estado PENDIENTE.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(gastos.length / itemsPerPage);

  const paginatedGastos = gastos.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
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
              <Button variant="gradient" onClick={handleSubmit} disabled={!formVendedor || !formMonto || !formTipo || !formFecha}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : gastos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No hay gastos registrados
                </TableCell>
              </TableRow>
            ) : (
              paginatedGastos.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {format(new Date(g.fecha + 'T00:00:00'), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{g.vendedor?.usuario?.nombre ?? '—'}</TableCell>
                  <TableCell>{g.tipo}</TableCell>
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
      </div>

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
    </div>
  );
};

export default ExpenseList;
