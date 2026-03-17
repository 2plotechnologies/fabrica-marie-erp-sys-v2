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
import { DevolucionItemPayload } from '@/services/devolucionService';

const WarehouseReturns = () => {
  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDevolucion, setSelectedDevolucion] = useState<typeof devoluciones[0] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailItems, setDetailItems] = useState<any[]>([]);

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
      const data = await devolucionService.getProductos();
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
    fetchProductos();
    fetchVendedores();
  }, []);

  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    vendedor_id: '',
    tipo_devolucion: '',
    motivo: '',
    observaciones: '',
  });

  const [formItems, setFormItems] = useState<{
    producto_id: number; cantidad: number; motivo: string | null;
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

  const handleAddProduct = () => {
    if (!selectedProduct) { toast.error('Selecciona un producto'); return; }
    const product = productos.find(p => p.id === selectedProduct);
    if (!product) return;
    if (formItems.some(item => item.producto_id === product.id)) { toast.error('Ya está en la lista'); return; }
    setFormItems([...formItems, {
      producto_id: Number(product.id), cantidad: 1, motivo: null,
    }]);
    setSelectedProduct('');
  };

  const handleSubmit = async () => {
    if (!formData.vendedor_id) { toast.error('Selecciona un vendedor'); return; }
    if (formItems.length === 0) { toast.error('Agrega al menos un producto'); return; }
    try {
      await devolucionService.create({
        fecha: formData.fecha,
        vendedor_id: Number(formData.vendedor_id),
        tipo: formData.tipo_devolucion,
        motivo: formData.motivo,
        observaciones: formData.observaciones,
        estado: "PENDIENTE",
        items: formItems
      });

      toast.success("Devolución creada correctamente");

      // refrescar lista
      await fetchDevoluciones();

      setFormData({ fecha: format(new Date(), 'yyyy-MM-dd'), vendedor_id: '', tipo_devolucion: 'BUENA', motivo: '', observaciones: '' });
      setFormItems([]);
      setIsDialogOpen(false);

    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(error?.message || "Error al crear Devolución");
    }
  };

  const handleViewDetail = async (devolucion: typeof devoluciones[0]) => {
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
      toast.error(error?.message || "Error al actualizar estado de la devolución");
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
        <div className="bg-card rounded-xl border shadow-card p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Pendientes</p><p className="text-xl font-bold">{devoluciones.filter(d => d.estado === 'PENDIENTE').length}</p></div></div></div>
        <div className="bg-card rounded-xl border shadow-card p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Recibidas</p><p className="text-xl font-bold">{devoluciones.filter(d => d.estado === 'ACEPTADA').length}</p></div></div></div>
        <div className="bg-card rounded-xl border shadow-card p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><Package className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Buenas</p><p className="text-xl font-bold">{devoluciones.filter(d => d.tipo === 'BUENA').length}</p></div></div></div>
        <div className="bg-card rounded-xl border shadow-card p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><PackageX className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Malas / Desecho</p><p className="text-xl font-bold">{devoluciones.filter(d => d.tipo === 'MALA').length}</p></div></div></div>
      </div>

      <div className="bg-card rounded-xl border shadow-card p-5 animate-slide-up">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por vendedor o motivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
          <div className="flex gap-2">
            <Select value={filterTipo} onValueChange={setFilterTipo}><SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="BUENA">Buena</SelectItem><SelectItem value="MALA">Mala</SelectItem></SelectContent></Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="PENDIENTE">Pendiente</SelectItem><SelectItem value="ACEPTADA">Recibido</SelectItem><SelectItem value="RECHAZADA">Rechazado</SelectItem><SelectItem value="DESECHO">Desecho</SelectItem></SelectContent></Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up">
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vendedor</TableHead><TableHead>Tipo</TableHead><TableHead>Motivo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredDevoluciones.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay devoluciones</TableCell></TableRow>
            ) : paginatedDevoluciones.map(d => (
              <TableRow key={d.id}>
                <TableCell>{format(new Date(d.fecha), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{d.vendedor?.usuario.nombre || '-'}</TableCell>
                <TableCell>{getTipoBadge(d.tipo)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{d.motivo || '-'}</TableCell>
                <TableCell>{getEstadoBadge(d.estado)}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleViewDetail(d)}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
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

      {/* New Return Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Devolución a Almacén</DialogTitle><DialogDescription>Registra una devolución de productos</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} /></div>
              <div className="space-y-2"><Label>Vendedor *</Label><Select value={formData.vendedor_id} onValueChange={(v) => setFormData({ ...formData, vendedor_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.usuario.nombre}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Devolución</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={formData.tipo_devolucion === 'BUENA' ? 'default' : 'outline'} className="gap-2" onClick={() => setFormData({ ...formData, tipo_devolucion: 'BUENA' })}><Package className="h-4 w-4" />Buena (No vendida)</Button>
                <Button type="button" variant={formData.tipo_devolucion === 'MALA' ? 'destructive' : 'outline'} className="gap-2" onClick={() => setFormData({ ...formData, tipo_devolucion: 'MALA' })}><PackageX className="h-4 w-4" />Mala (Dañada → Desecho)</Button>
              </div>
            </div>
            <div className="space-y-2"><Label>Motivo</Label><Input value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} /></div>
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Productos a Devolver</Label>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}><SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger><SelectContent>{productos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre} - {p.marca} ({p.presentacion})</SelectItem>)}</SelectContent></Select>
                <Button type="button" onClick={handleAddProduct}><Plus className="h-4 w-4" /></Button>
              </div>
              {formItems.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {formItems.map((item, index) => {
                    const prod = productos.find(p => p.id === item.producto_id);
                    return (
                      <div key={index} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                        <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{prod?.nombre}</p><p className="text-xs text-muted-foreground">{prod?.marca} • {prod?.presentacion}</p></div>
                        <Input type="number" min="1" value={item.cantidad} onChange={(e) => setFormItems(formItems.map((it, i) => i === index ? { ...it, cantidad: Math.max(1, parseInt(e.target.value) || 1) } : it))} className="w-20" />
                        <Input placeholder="Motivo" value={item.motivo || ''} onChange={(e) => setFormItems(formItems.map((it, i) => i === index ? { ...it, motivo: e.target.value || null } : it))} className="w-40" />
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setFormItems(formItems.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>Observaciones</Label><Textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Registrar Devolución</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedDevolucion && (
            <>
              <DialogHeader><DialogTitle>Detalle de Devolución</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Vendedor</p><p className="font-medium">{selectedDevolucion.vendedor?.usuario.nombre}</p></div>
                  <div><p className="text-muted-foreground">Tipo</p>{getTipoBadge(selectedDevolucion.tipo)}</div>
                  <div><p className="text-muted-foreground">Estado</p>{getEstadoBadge(selectedDevolucion.estado)}</div>
                </div>
                {selectedDevolucion.motivo && <div><p className="text-sm text-muted-foreground">Motivo</p><p>{selectedDevolucion.motivo}</p></div>}
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Marca</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {detailItems.map(item => (
                      <TableRow key={item.id}><TableCell>{item.producto.nombre}</TableCell><TableCell>{item.producto.marca || '-'}</TableCell><TableCell className="text-right font-semibold">{item.cantidad}</TableCell><TableCell>{item.motivo || '-'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
                {selectedDevolucion.estado === 'PENDIENTE' && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="gap-1 text-destructive" onClick={() => handleUpdateEstado(selectedDevolucion.id, 'RECHAZADA')}><XCircle className="h-4 w-4" />Rechazar</Button>
                    <Button className="gap-1" onClick={() => handleUpdateEstado(selectedDevolucion.id, 'ACEPTADA')}><CheckCircle className="h-4 w-4" />Recibir en Almacén</Button>
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
