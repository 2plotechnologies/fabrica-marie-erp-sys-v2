import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Banknote,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  Car,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { formatErrorMessage } from '@/lib/axios-error';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cajaChicaService } from '@/services/cajaChicaService';
import { mapaInteractivoService } from '@/services/mapaInteractivoService';
import { toast } from 'sonner';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

const estadoBadge: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  PENDIENTE: { variant: 'secondary', label: 'PENDIENTE' },
  APROBADO: { variant: 'default', label: 'APROBADO' },
  RECHAZADO: { variant: 'destructive', label: 'RECHAZADO' },
  LIQUIDADO: { variant: 'outline', label: 'LIQUIDADO' },
};

const ViaticosPage = () => {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === 'VENDEDOR';
  const [viaticos, setViaticos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [liquidacion, setLiquidacion] = useState({ usado: 0, vuelto: 0, comprobante: '' });
  const [selectedViatico, setSelectedViatico] = useState<any>(null);
  const [rutas, setRutas] = useState<any[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);
  const [salidas, setSalidas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterVendedor, setFilterVendedor] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [isLiquidarDialog, setIsLiquidarDialog] = useState(false);

  // Form state
  const [formVendedor, setFormVendedor] = useState('');
  const [formTipo, setFormTipo] = useState<'inicial' | 'viaje'>('inicial');
  const [formMonto, setFormMonto] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formZona, setFormZona] = useState('');
  const [formRuta, setFormRuta] = useState('');
  const [formSalida, setFormSalida] = useState('');
  const [formFecha, setFormFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  const vendedorActual = vendedores.find(v => v.usuario_id === user?.id);

  const filteredViaticos = viaticos.filter(v => {
    const matchVendedor = filterVendedor === 'all' || String(v.vendedor_id) === String(filterVendedor);
    const matchTipo = filterTipo === 'all' || v.tipo === filterTipo;
    const matchEstado = filterEstado === 'all' || v.estado === filterEstado;
    return matchVendedor && matchTipo && matchEstado;
  });

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredViaticos.length / itemsPerPage);

  const paginatedViaticos = filteredViaticos.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Stats
  const totalPendiente = viaticos.filter(v => v.estado === 'PENDIENTE').reduce((s, v) => s + Number(v.monto), 0);
  const totalAprobado = viaticos.filter(v => v.estado === 'APROBADO').reduce((s, v) => s + Number(v.monto), 0);
  const totalInicial = viaticos.filter(v => v.tipo === 'inicial').reduce((s, v) => s + Number(v.monto), 0);
  const totalViaje = viaticos.filter(v => v.tipo === 'viaje').reduce((s, v) => s + Number(v.monto), 0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [viaticosData, vendedoresData, rutasData, zonasData, salidasData] = await Promise.all([
          cajaChicaService.getAll(),
          cajaChicaService.getVendedores(),
          cajaChicaService.getRutas(),
          mapaInteractivoService.getZonas(),
          cajaChicaService.getSalidas(),
        ]);
        setViaticos(viaticosData);
        setVendedores(vendedoresData);
        setRutas(rutasData);
        setZonas(zonasData);
        setSalidas(salidasData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isVendedor && vendedorActual) {
      setFormVendedor(String(vendedorActual.id));
      setFilterVendedor(String(vendedorActual.id));
    }
  }, [isVendedor, vendedorActual]);

  const resetForm = () => {
    setFormVendedor(isVendedor && vendedorActual ? String(vendedorActual.id) : '');
    setFormTipo('inicial');
    setFormMonto('');
    setFormDescripcion('');
    setFormZona('');
    setFormRuta('');
    setFormSalida('');
    setFormFecha(format(new Date(), 'yyyy-MM-dd'));
  };


  const handleRutaChange = (rutaId: string) => {
    const rutaSeleccionada = rutas.find(r => String(r.id) === rutaId);
    setFormRuta(rutaId);
    if (rutaSeleccionada?.zona) {
      setFormZona(rutaSeleccionada.zona);
    }
  };

  const handleSubmit = async () => {
    if (!formVendedor || !formMonto || Number(formMonto) <= 0) {
      return;
    }

    try {
      await cajaChicaService.createViatico({
        vendedor_id: Number(formVendedor),
        fecha: formFecha,
        tipo: formTipo,
        monto: Number(formMonto),
        descripcion: formDescripcion || undefined,
        zona: formZona || undefined,
        ruta_id: formRuta ? Number(formRuta) : undefined,
        salida_id: formSalida ? Number(formSalida) : undefined,
      });
      const viaticosData = await cajaChicaService.getAll();
      setViaticos(viaticosData);
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear viático', error, 'No se pudo crear el viático.'));
    }
  };

  const handleUpdateEstado = async (id: number, estado: string) => {
    try {
      await cajaChicaService.updateViaticoEstado(id, estado);
      const viaticosData = await cajaChicaService.getAll();
      setViaticos(viaticosData);
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al actualizar estado de viático', error, 'No se pudo actualizar el estado del viático.'));
      if (error.response?.status === 403) {
        toast.error("Usted no tiene autorización para realizar esta acción");
      }
    }
  };

  const openLiquidar = (viatico: any) => {
    setSelectedViatico(viatico);
    const montoEntregado = Number(viatico.monto);
    setLiquidacion({ usado: montoEntregado, vuelto: 0, comprobante: '' });
    setIsLiquidarDialog(true);
  };

  const handleLiquidar = async (id: number) => {
    try {
      if (!id) return;
      await cajaChicaService.liquidarViatico({
        id: id,
        usado: liquidacion.usado,
        vuelto: liquidacion.vuelto,
        comprobante: liquidacion.comprobante,
      });
      const viaticosData = await cajaChicaService.getAll();
      setViaticos(viaticosData);
      setIsLiquidarDialog(false);
      setSelectedViatico(null);
      setLiquidacion({ usado: 0, vuelto: 0, comprobante: '' });
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al liquidar', error, 'No se pudo liquidar el viático.'));
      if (error.response?.status === 403) {
        toast.error("Usted no tiene autorización para realizar esta acción");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Caja Chica</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de caja chica para vendedores en ruta
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Caja Chica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Caja Chica</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vendedor *</Label>
                <Select value={formVendedor} onValueChange={setFormVendedor} disabled={isVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores?.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.usuario?.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Viático *</Label>
                <Select value={formTipo} onValueChange={(v) => setFormTipo(v as 'inicial' | 'viaje')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inicial">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Viático Inicial (Préstamo)
                      </div>
                    </SelectItem>
                    <SelectItem value="viaje">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Viático de Viaje
                      </div>
                    </SelectItem>
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
                    step="0.50"
                    placeholder="0.00"
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Zona</Label>
                  <Select value={formZona} onValueChange={setFormZona}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map(z => (
                        <SelectItem key={z.id} value={z.nombre}>
                          {z.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ruta</Label>
                  <Select
                    value={formRuta}
                    onValueChange={handleRutaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {rutas.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Salida de Fábrica (Viaje)</Label>
                <Select value={formSalida} onValueChange={setFormSalida}>
                  <SelectTrigger>
                    <SelectValue placeholder="Asignar a salida / viaje (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_salida">Sin Salida especificada</SelectItem>
                    {salidas?.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        #{s.id} - {s.fecha} - {s.vendedor?.usuario?.nombre} ({s.vehiculo?.placa || 'Sin vehículo'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Detalle del viático..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button variant="gradient" onClick={handleSubmit} disabled={!formVendedor || !formMonto || Number(formMonto) <= 0}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-base sm:text-lg font-bold truncate">S/ {Number(totalPendiente).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Aprobados</p>
                <p className="text-base sm:text-lg font-bold truncate">S/ {Number(totalAprobado).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Inicial</p>
                <p className="text-base sm:text-lg font-bold truncate">S/ {Number(totalInicial).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Car className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">De Viaje</p>
                <p className="text-base sm:text-lg font-bold truncate">S/ {Number(totalViaje).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <Select value={filterVendedor} onValueChange={setFilterVendedor} disabled={isVendedor}>
          <SelectTrigger className="w-full">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vendedores</SelectItem>
            {vendedores?.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.usuario.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="inicial">Inicial</SelectItem>
            <SelectItem value="viaje">De Viaje</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="APROBADO">Aprobado</SelectItem>
            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
            <SelectItem value="LIQUIDADO">Liquidado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Zona / Ruta</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredViaticos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No hay registros de caja chica
                </TableCell>
              </TableRow>
            ) : (
              paginatedViaticos.map((v) => {
                const badge = estadoBadge[v.estado] ?? estadoBadge.pendiente;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {format(new Date(v.fecha + 'T00:00:00'), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{v.vendedor?.usuario.nombre ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={v.tipo === 'inicial' ? 'default' : 'secondary'} className="gap-1">
                        {v.tipo === 'inicial' ? <Wallet className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                        {v.tipo === 'inicial' ? 'Inicial' : 'Viaje'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {v.zona && <span>{v.zona}</span>}
                        {v.zona && v.ruta.nombre && <span> / </span>}
                        {v.ruta.nombre && <span>{v.ruta.nombre}</span>}
                        {!v.zona && !v.ruta && '—'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {v.descripcion || '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      S/ {Number(v.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {v.estado === 'PENDIENTE' && !isVendedor && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleUpdateEstado(v.id, 'APROBADO')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleUpdateEstado(v.id, 'RECHAZADO')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {v.estado === 'APROBADO' && !isVendedor && (
                        <Button variant="outline" size="sm" onClick={() => openLiquidar(v)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Liquidar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
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
        {/* Liquidar Dialog */}
        <Dialog open={isLiquidarDialog} onOpenChange={setIsLiquidarDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Liquidar Viatico</DialogTitle></DialogHeader>
            {selectedViatico && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Monto Usado (S/)</Label>
                  <Input
                    type="number" placeholder="0.00"
                    value={liquidacion.usado || ''}
                    onChange={(e) => {
                      const usado = parseFloat(e.target.value) || 0;
                      setLiquidacion({
                        ...liquidacion,
                        usado: usado,
                        vuelto: Math.max(0, Number(selectedViatico.monto) - usado),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vuelto (S/)</Label>
                  <Input type="number" readOnly className="bg-muted" value={Number(liquidacion.vuelto).toFixed(2)} />
                </div>
                <div className="space-y-2">
                  <Label>Comprobante / Referencia</Label>
                  <Input placeholder="Nro. de boleta, etc." value={liquidacion.comprobante} onChange={(e) => setLiquidacion({ ...liquidacion, comprobante: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLiquidarDialog(false)}>Cancelar</Button>
              <Button onClick={() => handleLiquidar(selectedViatico.id)} className="bg-emerald-600 hover:bg-emerald-700">
                Confirmar Liquidación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ViaticosPage;
