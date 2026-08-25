/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Package, PackageX, Plus, Search, Filter, Eye, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { devolucionService } from '@/services/devolucionService';
import { formatErrorMessage } from '@/lib/axios-error';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';

const WarehouseReturns = () => {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isVendedor = currentRole === 'VENDEDOR';

  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    vendedor_id: '',
    tipo_devolucion: 'BUENA',
    origen_stock: 'REGULAR',
    motivo: '',
    observaciones: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDevolucion, setSelectedDevolucion] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailItems, setDetailItems] = useState<any[]>([]);

  const vendedorActual = vendedores.find(v => v.usuario_id === user?.id);

  const fetchDevoluciones = async () => {
    try {
      const data = await devolucionService.getAll();
      console.log(data);
      setDevoluciones(data);
      setIsLoading(true);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      let data;
      const targetVendedorId = formData.vendedor_id || (isVendedor && vendedorActual ? vendedorActual.id : null);
      if (targetVendedorId) {
        const rawStock = await devolucionService.getProductosVendedor(Number(targetVendedorId));
        const map: Record<number, any> = {};
        (rawStock || []).forEach((sv: any) => {
          const p = sv.producto;
          if (!p) return;
          if (!map[p.id]) {
            map[p.id] = {
              ...p,
              stockActual: 0,
              stockDefectuoso: 0
            };
          }
          map[p.id].stockActual += Number(sv.cantidad || 0);
          map[p.id].stockDefectuoso += Number(sv.defectuosos || 0);
        });
        data = Object.values(map);
      } else {
        data = await devolucionService.getProductos();
      }
      setProductos(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const data = await devolucionService.getVendedores();
      setVendedores(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDevoluciones();
    fetchVendedores();
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [formData.vendedor_id, currentRole]);

  useEffect(() => {
    if (isVendedor && vendedorActual) {
      setFormData(prev => ({ ...prev, vendedor_id: String(vendedorActual.id) }));
    }
  }, [isVendedor, vendedorActual]);

  const [formItems, setFormItems] = useState<{
    producto_id: number; cantidad: number | string; motivo: string | null;
  }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  const filteredDevoluciones = devoluciones.filter(dev => {
    const matchSearch = dev.vendedor?.usuario?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || dev.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filterTipo === 'all' || dev.tipo === filterTipo;
    const matchEstado = filterEstado === 'all' || dev.estado === filterEstado;
    return matchSearch && matchTipo && matchEstado;
  });

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredDevoluciones.length / itemsPerPage);

  const paginatedDevoluciones = filteredDevoluciones.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStockDisponible = (prod: any) => {
    if (!prod) return Infinity;
    if (formData.tipo_devolucion === 'MALA' && formData.origen_stock === 'DEFECTUOSOS') {
      return prod.stockDefectuoso !== undefined ? prod.stockDefectuoso : Infinity;
    }
    return prod.stockActual !== undefined ? prod.stockActual : Infinity;
  };

  const handleAddProduct = () => {
    if (!selectedProduct) { toast.error('Selecciona un producto'); return; }
    const product = productos.find(p => String(p.id) === selectedProduct);
    if (!product) return;
    if (formItems.some(item => item.producto_id === product.id)) { toast.error('Ya está en la lista'); return; }
    
    const stockDisp = getStockDisponible(product);
    if (isVendedor && stockDisp !== Infinity && stockDisp <= 0) {
      toast.error('No tienes stock suficiente de este producto para el origen seleccionado');
      return;
    }
    setFormItems([...formItems, {
      producto_id: Number(product.id), cantidad: 1, motivo: null,
    }]);
    setSelectedProduct('');
  };

  const handleSubmit = async () => {
    if (!formData.vendedor_id) { toast.error('Selecciona un vendedor'); return; }
    if (formItems.length === 0) { toast.error('Agrega al menos un producto'); return; }

    for (const item of formItems) {
      const prod = productos.find(p => p.id === item.producto_id);
      const maxVal = getStockDisponible(prod);
      const numVal = parseFloat(String(item.cantidad));

      if (isNaN(numVal) || numVal <= 0) {
        toast.error(`La cantidad para ${prod?.nombre || 'el producto'} debe ser mayor a 0`);
        return;
      }
      if (numVal > maxVal) {
        toast.error(`La cantidad para ${prod?.nombre || 'el producto'} (${numVal}) excede el stock disponible (${maxVal})`);
        return;
      }
    }

    try {
      await devolucionService.create({
        fecha: formData.fecha,
        vendedor_id: Number(formData.vendedor_id),
        tipo: formData.tipo_devolucion,
        origen_stock: formData.tipo_devolucion === 'MALA' ? formData.origen_stock : 'REGULAR',
        motivo: formData.motivo,
        observaciones: formData.observaciones,
        estado: "PENDIENTE",
        items: formItems.map(it => ({ ...it, cantidad: Number(it.cantidad) }))
      });

      toast.success("Devolución creada correctamente");

      // refrescar lista
      await fetchDevoluciones();

      setFormData({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        vendedor_id: isVendedor && vendedorActual ? String(vendedorActual.id) : '',
        tipo_devolucion: 'BUENA',
        origen_stock: 'REGULAR',
        motivo: '',
        observaciones: ''
      });
      setFormItems([]);
      setIsDialogOpen(false);

    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al crear devolución', error, 'No se pudo crear la devolución.'));
    }
  };

  const handleViewDetail = async (devolucion: any) => {
    setSelectedDevolucion(devolucion);

    const data = await devolucionService.getById(devolucion.id);

    console.log("Respuesta completa:", data);
    console.log("Items:", data.items);

    setDetailItems(data.items ?? []);

    setIsDetailOpen(true);
  };

  const handleUpdateEstado = async (id: string, estado: string) => {
    try {
      await devolucionService.updateEstado(Number(id), estado);
      await fetchDevoluciones();
      setIsDetailOpen(false);
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al actualizar estado de la devolución', error, 'No se pudo actualizar el estado de la devolución.'));
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return <Badge variant="outline" className="border-warning text-warning"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'ACEPTADA': return <Badge variant="outline" className="border-success text-success"><CheckCircle className="h-3 w-3 mr-1" />Recibido</Badge>;
      case 'RECHAZADA': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
      case 'DESECHO ': return <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Desecho</Badge>;
      default: return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'BUENA': return <Badge variant="outline" className="border-success text-success"><Package className="h-3 w-3 mr-1" />Buena</Badge>;
      case 'MALA': return <Badge variant="destructive"><PackageX className="h-3 w-3 mr-1" />Mala</Badge>;
      default: return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div><h1 className="text-2xl lg:text-3xl font-display font-bold">Devoluciones a Almacén</h1><p className="text-muted-foreground mt-1">Gestiona las devoluciones de productos (buenas y malas)</p></div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nueva Devolución</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-slide-up">
        <div className="bg-card rounded-xl border shadow-card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-warning/10 shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Pendientes</p>
              <p className="text-lg sm:text-xl font-bold truncate">{devoluciones.filter(d => d.estado === 'PENDIENTE').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border shadow-card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-success/10 shrink-0"><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Recibidas</p>
              <p className="text-lg sm:text-xl font-bold truncate">{devoluciones.filter(d => d.estado === 'ACEPTADA').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border shadow-card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-success/10 shrink-0"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-success" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Buenas</p>
              <p className="text-lg sm:text-xl font-bold truncate">{devoluciones.filter(d => d.tipo === 'BUENA').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border shadow-card p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-destructive/10 shrink-0"><PackageX className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Malas / Desecho</p>
              <p className="text-lg sm:text-xl font-bold truncate">{devoluciones.filter(d => d.tipo === 'MALA').length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-card p-4 sm:p-5 animate-slide-up">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por vendedor o motivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-1/2 sm:w-[150px] min-w-0"><Filter className="h-4 w-4 mr-2 shrink-0" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="BUENA">Buena</SelectItem><SelectItem value="MALA">Mala</SelectItem></SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-1/2 sm:w-[150px] min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="PENDIENTE">Pendiente</SelectItem><SelectItem value="ACEPTADA">Recibido</SelectItem><SelectItem value="RECHAZADA">Rechazado</SelectItem><SelectItem value="DESECHO">Desecho</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up p-3 sm:p-0">
        {/* Mobile Card View */}
        <div className="space-y-3 sm:hidden">
          {filteredDevoluciones.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No hay devoluciones</div>
          ) : (
            paginatedDevoluciones.map(d => (
              <div key={d.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2 text-xs min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground truncate">{d.vendedor?.usuario?.nombre || '-'}</p>
                    <p className="text-[11px] text-muted-foreground">📅 {format(new Date(d.fecha), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {getEstadoBadge(d.estado)}
                    {getTipoBadge(d.tipo)}
                  </div>
                </div>

                {d.motivo && (
                  <div className="pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                    <strong>Motivo:</strong> <span className="break-words text-foreground">{d.motivo}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1 border-t border-border/50">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1" onClick={() => handleViewDetail(d)}>
                    <Eye className="h-3.5 w-3.5" /> Ver Detalle
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto w-full">
          <Table className="w-full min-w-[700px]">
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vendedor</TableHead><TableHead>Tipo</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredDevoluciones.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay devoluciones</TableCell></TableRow>
              ) : paginatedDevoluciones.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap">{format(new Date(d.fecha), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{d.vendedor?.usuario.nombre || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">{getTipoBadge(d.tipo)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d.motivo || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">{getEstadoBadge(d.estado)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap"><Button variant="ghost" size="icon" onClick={() => handleViewDetail(d)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
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

      {/* New Return Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader><DialogTitle className="text-lg sm:text-xl">Nueva Devolución a Almacén</DialogTitle><DialogDescription className="text-xs sm:text-sm">Registra una devolución de productos</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Vendedor *</Label>
                <Select
                  value={formData.vendedor_id}
                  disabled={isVendedor}
                  onValueChange={(v) => setFormData({ ...formData, vendedor_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.usuario.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Devolución</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button type="button" variant={formData.tipo_devolucion === 'BUENA' ? 'default' : 'outline'} className="gap-2 text-xs sm:text-sm" onClick={() => setFormData({ ...formData, tipo_devolucion: 'BUENA' })}><Package className="h-4 w-4" />Buena (No vendida)</Button>
                <Button type="button" variant={formData.tipo_devolucion === 'MALA' ? 'destructive' : 'outline'} className="gap-2 text-xs sm:text-sm" onClick={() => setFormData({ ...formData, tipo_devolucion: 'MALA' })}><PackageX className="h-4 w-4" />Mala (Dañada → Desecho)</Button>
              </div>
            </div>

            {formData.tipo_devolucion === 'MALA' && (
              <div className="space-y-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200/50">
                <Label className="font-semibold text-amber-800 dark:text-amber-300 text-xs sm:text-sm">Origen de Productos Defectuosos</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs"
                    variant={formData.origen_stock === 'DEFECTUOSOS' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, origen_stock: 'DEFECTUOSOS' })}
                  >
                    🔄 Stock Defectuoso (Canjes)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs"
                    variant={formData.origen_stock === 'REGULAR' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, origen_stock: 'REGULAR' })}
                  >
                    🚚 Stock Regular (Vehículo)
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2"><Label>Motivo</Label><Input value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} /></div>
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Productos a Devolver</Label>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1 min-w-0">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map(p => {
                      const stockDisp = getStockDisponible(p);
                      return (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre} - {p.marca} ({p.presentacion}){stockDisp !== Infinity ? ` - Stock disponible: ${stockDisp}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button type="button" shrink-0 onClick={handleAddProduct}><Plus className="h-4 w-4" /></Button>
              </div>
              {formItems.length > 0 && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {formItems.map((item, index) => {
                    const prod = productos.find(p => p.id === item.producto_id);
                    const stockDisp = getStockDisponible(prod);
                    return (
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-secondary/30 rounded-lg min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm break-words">{prod?.nombre}</p>
                          <p className="text-xs text-muted-foreground">{prod?.marca} • {prod?.presentacion}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="number"
                            step={prod?.tipo_venta === 'GRANEL' ? '0.01' : '1'}
                            min={prod?.tipo_venta === 'GRANEL' ? "0.01" : "1"}
                            max={stockDisp !== Infinity ? stockDisp : undefined}
                            value={item.cantidad}
                            onChange={(e) => {
                              let valStr = e.target.value;
                              if (valStr && prod?.tipo_venta === 'UNIDAD' && valStr.includes('.')) {
                                valStr = valStr.split('.')[0];
                              }
                              setFormItems(formItems.map((it, i) => i === index ? {
                                ...it,
                                cantidad: valStr
                              } : it));
                            }}
                            onBlur={() => {
                              const maxVal = getStockDisponible(prod);
                              const isGranel = prod?.tipo_venta === 'GRANEL';
                              const minVal = isGranel ? 0.01 : 1;
                              let numVal = parseFloat(String(item.cantidad));

                              if (isNaN(numVal) || numVal < minVal) {
                                toast.error(`La cantidad mínima es ${minVal}`);
                                numVal = minVal;
                              } else if (numVal > maxVal) {
                                toast.error(`La cantidad no puede superar el stock disponible (${maxVal})`);
                                numVal = maxVal;
                              } else if (!isGranel) {
                                numVal = Math.floor(numVal);
                              }

                              setFormItems(formItems.map((it, i) => i === index ? {
                                ...it,
                                cantidad: numVal
                              } : it));
                            }}
                            className="w-24 shrink-0"
                          />
                          <Input placeholder="Motivo" value={item.motivo || ''} onChange={(e) => setFormItems(formItems.map((it, i) => i === index ? { ...it, motivo: e.target.value || null } : it))} className="flex-1 sm:w-40 min-w-0" />
                          <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setFormItems(formItems.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Observaciones</Label><Textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleSubmit}>Registrar Devolución</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          {selectedDevolucion && (
            <>
              <DialogHeader><DialogTitle className="text-lg sm:text-xl">Detalle de Devolución</DialogTitle></DialogHeader>
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-lg">
                  <div><p className="text-muted-foreground text-xs">Vendedor</p><p className="font-medium text-foreground">{selectedDevolucion.vendedor?.usuario.nombre}</p></div>
                  <div><p className="text-muted-foreground text-xs">Tipo</p>{getTipoBadge(selectedDevolucion.tipo)}</div>
                  <div><p className="text-muted-foreground text-xs">Estado</p>{getEstadoBadge(selectedDevolucion.estado)}</div>
                </div>
                {selectedDevolucion.motivo && <div className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50"><p className="text-xs text-muted-foreground">Motivo</p><p className="break-words font-medium">{selectedDevolucion.motivo}</p></div>}
                
                <div className="overflow-x-auto w-full border rounded-lg">
                  <Table className="w-full min-w-[500px]">
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Marca</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailItems.map(item => (
                        <TableRow key={item.id}><TableCell className="break-words max-w-[150px]">{item.producto.nombre}</TableCell><TableCell className="whitespace-nowrap">{item.producto.marca || '-'}</TableCell><TableCell className="text-right font-semibold whitespace-nowrap">{item.cantidad}</TableCell><TableCell className="break-words max-w-[150px]">{item.motivo || '-'}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {selectedDevolucion.estado === 'PENDIENTE' && !isVendedor && (
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" className="gap-1 text-destructive w-full sm:w-auto" onClick={() => handleUpdateEstado(selectedDevolucion.id, 'RECHAZADA')}><XCircle className="h-4 w-4" />Rechazar</Button>
                    <Button className="gap-1 w-full sm:w-auto" onClick={() => handleUpdateEstado(selectedDevolucion.id, 'ACEPTADA')}><CheckCircle className="h-4 w-4" />Recibir en Almacén</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseReturns;
