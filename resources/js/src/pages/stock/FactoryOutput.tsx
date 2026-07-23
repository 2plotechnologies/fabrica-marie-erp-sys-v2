/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, FileDown, Truck, Package, Search, Eye, AlertTriangle, Pencil } from 'lucide-react';
import { salidaService } from '@/services/salidaService';
import { stockService } from '@/services/stockService';
import { SalidaItemPayload } from '@/services/salidaService';
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

const FactoryOutput = () => {
  const [salidas, setSalidas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [rumas, setRumas] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [stockInfo, setStockInfo] = useState<any[]>([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSalidaId, setEditingSalidaId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSalida, setSelectedSalida] = useState<typeof salidas[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');

  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], vendedor_id: '', conductor: '', vehiculo_id: '', zona: '', ruta: '' });
  const [items, setItems] = useState<SalidaItemPayload[]>([]);
  const [tempItem, setTempItem] = useState({ producto_id: '', cantidad: '', ruma_id: '' });
  const [isLoading, setIsLoading] = useState(true);

  const handleVehiculoChange = async (vehiculoId: string) => {
    const vehiculoSeleccionado = vehiculos.find(v => String(v.id) === vehiculoId);
    setForm(prev => ({
      ...prev,
      vehiculo_id: vehiculoId,
      conductor: vehiculoSeleccionado?.chofer || prev.conductor,
    }));

    try {
      const sobrantes = await salidaService.getSobrantes(vehiculoId);
      if (sobrantes && sobrantes.length > 0) {
        setItems(sobrantes);
        toast.success(`Se agregaron ${sobrantes.length} productos sobrantes del vehículo.`);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.log('Error al obtener sobrantes', error);
      setItems([]);
    }
  };

  const handleRutaChange = (rutaId: string) => {
    const rutaSeleccionada = rutas.find(r => String(r.id) === rutaId);
    setForm(prev => ({
      ...prev,
      ruta: rutaId,
      zona: rutaSeleccionada?.zona || prev.zona,
    }));
  };

  const filtered = salidas.filter(s => {
    const matchSearch = s.vendedor?.usuario.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || s.vehiculo.placa?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === 'all' || s.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedRecords = filtered.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const fetchSalidas = async () => {
    try {
      const data = await salidaService.getAll();
      setSalidas(data);
      setIsLoading(true);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const data = await salidaService.getProductos();
      setProductos(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchRumas = async () => {
    try {
      const data = await salidaService.getRumas();
      setRumas(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchStock = async () => {
    try {
      const data = await stockService.getAll();
      setStockInfo(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchRutas = async () => {
    try {
      const data = await salidaService.getRutas();
      setRutas(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchVehiculos = async () => {
    try {
      const data = await salidaService.getVehiculos();
      setVehiculos(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const data = await salidaService.getVendedores();
      setVendedores(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSalidas();
    fetchProductos();
    fetchRumas();
    fetchRutas();
    fetchVehiculos();
    fetchVendedores();
    fetchStock();
  }, []);

  const handleAddItem = () => {
    if (!tempItem.producto_id || !tempItem.cantidad || !tempItem.ruma_id) {
      toast.error('Selecciona producto, ruma y cantidad');
      return;
    }

    const prodId = Number(tempItem.producto_id);
    const rumaId = Number(tempItem.ruma_id);
    const cant = Number(tempItem.cantidad);

    const existingIdx = items.findIndex(i => i.producto_id === prodId && i.ruma_id === rumaId && !i.es_sobrante);

    if (existingIdx >= 0) {
      const newItems = [...items];
      newItems[existingIdx].cantidad += cant;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          producto_id: prodId,
          ruma_id: rumaId,
          cantidad: cant,
        }
      ]);
    }

    setTempItem({ producto_id: '', cantidad: '', ruma_id: '' });
  };

  const handleCreate = async () => {
    if (!form.vendedor_id || items.length === 0) {
      toast.error('Selecciona vendedor y agrega productos');
      return;
    }

    try {
      await salidaService.create({
        fecha: form.fecha,
        conductor: form.conductor,
        vehiculo_id: Number(form.vehiculo_id),
        vendedor_id: Number(form.vendedor_id),
        zona: form.zona,
        ruta_id: Number(form.ruta),
        estado: "PENDIENTE",
        items: items
      });

      toast.success("Salida creada correctamente");

      setForm({
        fecha: new Date().toISOString().split('T')[0],
        vendedor_id: '',
        conductor: '',
        vehiculo_id: '',
        zona: '',
        ruta: ''
      });

      // refrescar lista
      await fetchSalidas();

      setItems([]);
      setIsNewOpen(false);

    } catch (error: any) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      const backendError = error.response?.data?.error || error.response?.data?.message || 'No se pudo crear la salida.';
      toast.error(backendError);
    }
  };

  const handleOpenEdit = (salida: any) => {
    setEditingSalidaId(salida.id);
    setForm({
      fecha: salida.fecha,
      vendedor_id: String(salida.vendedor_id),
      conductor: salida.conductor || '',
      vehiculo_id: String(salida.vehiculo_id),
      zona: salida.zona || '',
      ruta: String(salida.ruta_id),
    });
    setItems(salida.items.map((item: any) => ({
      producto_id: item.producto_id,
      ruma_id: item.ruma_id,
      cantidad: Number(item.cantidad),
      es_sobrante: item.es_sobrante || false,
    })));
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingSalidaId) return;
    if (!form.vendedor_id || items.length === 0) {
      toast.error('Selecciona vendedor y agrega productos');
      return;
    }

    try {
      await salidaService.update(editingSalidaId, {
        fecha: form.fecha,
        conductor: form.conductor,
        vehiculo_id: Number(form.vehiculo_id),
        vendedor_id: Number(form.vendedor_id),
        zona: form.zona,
        ruta_id: Number(form.ruta),
        estado: "PENDIENTE",
        items: items
      });

      toast.success("Salida actualizada correctamente");

      setForm({
        fecha: new Date().toISOString().split('T')[0],
        vendedor_id: '',
        conductor: '',
        vehiculo_id: '',
        zona: '',
        ruta: ''
      });

      await fetchSalidas();
      setItems([]);
      setEditingSalidaId(null);
      setIsEditOpen(false);

    } catch (error: any) {
      console.log("ERROR ACTUALIZACION:", error);
      const backendError = error.response?.data?.error || error.response?.data?.message || 'No se pudo actualizar la salida.';
      toast.error(backendError);
    }
  };

  const handleUpdateEstado = async (id: number, nuevoEstado: string) => {
    try {
      await salidaService.updateEstado(id, nuevoEstado);

      toast.success("Estado actualizado");

      // refrescar lista
      await fetchSalidas();

    } catch (error) {
      toast.error(formatErrorMessage('Error al actualizar estado', error, 'No se pudo actualizar el estado.'));
    }
  };

  const handleAnular = async (id: number) => {
    if (!window.confirm("¿Estás seguro de anular esta salida? Se revertirá el stock descontado y los sobrantes de la salida anterior.")) {
      return;
    }
    try {
      await salidaService.anular(id);
      toast.success("Salida anulada y stock revertido.");
      await fetchSalidas();
    } catch (error) {
      toast.error(formatErrorMessage('Error al anular la salida', error, 'No se pudo anular la salida.'));
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pendiente</Badge>;
      case 'EN_RUTA': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">En Ruta</Badge>;
      case 'COMPLETADO': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Completada</Badge>;
      case 'ANULADO': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Anulada</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-display font-bold text-foreground">Salida de Fábrica</h1><p className="text-muted-foreground">Control de entrega de productos a vendedores</p></div>
        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-warm hover:opacity-90"><Plus className="h-4 w-4 mr-2" />Nueva Salida</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Salida de Fábrica</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
                <div className="space-y-2"><Label>Vendedor *</Label><Select value={form.vendedor_id} onValueChange={v => setForm({ ...form, vendedor_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.usuario.nombre}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Vehiculo *</Label><Select value={form.vehiculo_id} onValueChange={handleVehiculoChange}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} - {v.chofer} - {v.marca} {v.modelo} {v.estado}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Conductor</Label><Input value={form.conductor} onChange={e => setForm({ ...form, conductor: e.target.value })} /></div>
                <div className="space-y-2"><Label>Zona</Label><Input value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} /></div>
                <div className="space-y-2"><Label>Ruta</Label><Select value={form.ruta} onValueChange={handleRutaChange}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{rutas.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>)}</SelectContent></Select></div>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Agregar Productos</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    <Select value={tempItem.producto_id} onValueChange={v => { setTempItem({ ...tempItem, producto_id: v, ruma_id: '' }); }}>
                      <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                      <SelectContent>
                        {productos.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nombre} ({p.sku})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Input type="number" placeholder="Cantidad" value={tempItem.cantidad} onChange={e => setTempItem({ ...tempItem, cantidad: e.target.value })} />
                    
                    <Select value={tempItem.ruma_id} onValueChange={v => setTempItem({ ...tempItem, ruma_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Ruma origen" /></SelectTrigger>
                      <SelectContent>
                        {tempItem.producto_id ? (
                          (stockInfo.find(s => String(s.producto_id) === String(tempItem.producto_id))?.rumas || []).length > 0 ? (
                            stockInfo.find(s => String(s.producto_id) === String(tempItem.producto_id))?.rumas.map((r: any) => (
                              <SelectItem key={r.id} value={r.id.toString()}>{r.codigo} (Disp: {r.cantidad})</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>Sin stock en rumas</SelectItem>
                          )
                        ) : (
                          <SelectItem value="none" disabled>Selecciona producto primero</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddItem}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
                  </div>
                </CardContent>
              </Card>

              {items.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Ruma</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const prod = productos.find(p => p.id === item.producto_id);
                      const ruma = rumas.find(r => r.id === item.ruma_id);
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            {prod?.nombre} ({prod?.sku})
                            {item.es_sobrante && <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Sobrante</Badge>}
                          </TableCell>
                          <TableCell>{ruma?.codigo || '-'}</TableCell>
                          <TableCell className="text-right font-semibold">{item.cantidad}</TableCell>
                          <TableCell><Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-gradient-warm hover:opacity-90">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Truck className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Salidas</p><p className="text-2xl font-bold">{salidas.length}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Package className="h-6 w-6 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Pendientes</p><p className="text-2xl font-bold">{salidas.filter(s => s.estado === 'PENDIENTE').length}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Truck className="h-6 w-6 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">En Ruta</p><p className="text-2xl font-bold">{salidas.filter(s => s.estado === 'EN_RUTA').length}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Package className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Completadas</p><p className="text-2xl font-bold">{salidas.filter(s => s.estado === 'COMPLETADO').length}</p></div></div></CardContent></Card>
      </div>

      <Card className="shadow-card"><CardContent className="pt-6"><div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" /></div><Select value={filterEstado} onValueChange={setFilterEstado}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="PENDIENTE">Pendiente</SelectItem><SelectItem value="EN_RUTA">En Ruta</SelectItem><SelectItem value="COMPLETADO">Completada</SelectItem></SelectContent></Select></div></CardContent></Card>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vendedor</TableHead><TableHead>Conductor</TableHead><TableHead>Vehículo</TableHead><TableHead>Zona/Ruta</TableHead><TableHead>Items</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {paginatedRecords.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{format(new Date(s.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-medium">{s.vendedor?.usuario.nombre}</TableCell>
                  <TableCell>{s.conductor || '-'}</TableCell>
                  <TableCell>{s.vehiculo.placa || '-'}</TableCell>
                  <TableCell className="text-sm">{s.zona || '-'} / {s.ruta.nombre || '-'}</TableCell>
                  <TableCell><Badge variant="secondary">{s.items?.length || 0} prod.</Badge></TableCell>
                  <TableCell>{getEstadoBadge(s.estado)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSalida(s); setIsDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      {(s.estado === 'PENDIENTE' || s.estado === 'EN_RUTA') && (
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}><Pencil className="h-4 w-4 text-blue-600" /></Button>
                      )}
                      {s.estado === 'PENDIENTE' && <Button size="sm" variant="outline" onClick={() => handleUpdateEstado(s.id, 'EN_RUTA')}>Despachar</Button>}
                      {s.estado === 'EN_RUTA' && <Button size="sm" variant="outline" onClick={() => handleUpdateEstado(s.id, 'COMPLETADO')}>Completar</Button>}
                      {(s.estado === 'PENDIENTE' || s.estado === 'EN_RUTA') && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAnular(s.id)}>
                          Anular
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedRecords.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay salidas registradas</TableCell></TableRow>}
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Salida de Fábrica #{editingSalidaId}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
              <div className="space-y-2"><Label>Vendedor *</Label><Select value={form.vendedor_id} onValueChange={v => setForm({ ...form, vendedor_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vendedores.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.usuario.nombre}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Vehiculo *</Label><Select value={form.vehiculo_id} onValueChange={handleVehiculoChange}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.placa} - {v.chofer} - {v.marca} {v.modelo} ({v.estado})</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Conductor</Label><Input value={form.conductor} onChange={e => setForm({ ...form, conductor: e.target.value })} /></div>
              <div className="space-y-2"><Label>Zona</Label><Input value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} /></div>
              <div className="space-y-2"><Label>Ruta</Label><Select value={form.ruta} onValueChange={handleRutaChange}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{rutas.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.nombre}</SelectItem>)}</SelectContent></Select></div>
            </div>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Agregar Productos</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  <Select value={tempItem.producto_id} onValueChange={v => { setTempItem({ ...tempItem, producto_id: v, ruma_id: '' }); }}>
                    <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                    <SelectContent>
                      {productos.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nombre} ({p.sku})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  <Input type="number" placeholder="Cantidad" value={tempItem.cantidad} onChange={e => setTempItem({ ...tempItem, cantidad: e.target.value })} />
                  
                  <Select value={tempItem.ruma_id} onValueChange={v => setTempItem({ ...tempItem, ruma_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Ruma origen" /></SelectTrigger>
                    <SelectContent>
                      {tempItem.producto_id ? (
                        (stockInfo.find(s => String(s.producto_id) === String(tempItem.producto_id))?.rumas || []).length > 0 ? (
                          stockInfo.find(s => String(s.producto_id) === String(tempItem.producto_id))?.rumas.map((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.codigo} (Disp: {r.cantidad})</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>Sin stock en rumas</SelectItem>
                        )
                      ) : (
                        <SelectItem value="none" disabled>Selecciona producto primero</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddItem}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
                </div>
              </CardContent>
            </Card>

            {items.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Ruma</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const prod = productos.find(p => p.id === item.producto_id);
                    const ruma = rumas.find(r => r.id === item.ruma_id);
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          {prod?.nombre} ({prod?.sku})
                          {item.es_sobrante && <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Sobrante</Badge>}
                        </TableCell>
                        <TableCell>{ruma?.codigo || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <Input 
                            type="number" 
                            className="w-24 text-right inline-block" 
                            value={item.cantidad} 
                            onChange={e => {
                              const newCant = Number(e.target.value);
                              if (newCant >= 1) {
                                const updated = [...items];
                                updated[idx].cantidad = newCant;
                                setItems(updated);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} className="bg-gradient-warm hover:opacity-90">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedSalida && (
            <>
              <DialogHeader><DialogTitle>Detalle de Salida - {format(new Date(selectedSalida.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Vendedor</p><p className="font-medium">{selectedSalida.vendedor?.usuario.nombre}</p></div>
                  <div><p className="text-muted-foreground">Conductor</p><p className="font-medium">{selectedSalida.conductor || '-'}</p></div>
                  <div><p className="text-muted-foreground">Vehículo</p><p className="font-medium">{selectedSalida.vehiculo.placa || '-'}</p></div>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Marca</TableHead><TableHead>Ruma</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(() => {
                      const groupedItems = selectedSalida.items?.reduce((acc: any[], currentItem: any) => {
                        const existing = acc.find(i => i.producto_id === currentItem.producto_id && i.ruma_id === currentItem.ruma_id);
                        if (existing) {
                          existing.cantidad = Number(existing.cantidad) + Number(currentItem.cantidad);
                        } else {
                          acc.push({ ...currentItem, cantidad: Number(currentItem.cantidad) });
                        }
                        return acc;
                      }, []) || [];

                      return groupedItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.producto?.nombre} ({item.producto?.sku})</TableCell>
                          <TableCell>{item.producto?.marca || '-'}</TableCell>
                          <TableCell>{item.ruma?.codigo || '-'}</TableCell>
                          <TableCell className="text-right font-semibold">{item.cantidad}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FactoryOutput;
