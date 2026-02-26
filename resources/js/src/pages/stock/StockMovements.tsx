/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, ArrowUpCircle, ArrowDownCircle, RotateCcw, Settings2, Calendar, Filter, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { movimientoService } from '@/services/movimientoStockService';
import { toast } from '@/hooks/use-toast';
import { setFips } from 'crypto';

const StockMovements = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [rumas, setRumas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovimientos = async () => {
        try {
          setIsLoading(true);
          const data = await movimientoService.getAll();
          console.log('Movimientos:', data);
          setMovimientos(data);
        } catch (err: any) {
          setError(err?.message || 'Error al obtener movimientos');
        } finally {
          setIsLoading(false);
        }
      };

      const fetchProductos = async () => {
        try {
            const data = await movimientoService.getProductos();
            setProductos(data);
        } catch (error) {
            console.log(error);
        }
      };

      const fetchRumas = async () => {
        try {
            const data = await movimientoService.getRumas();
            setRumas(data);
        } catch (error) {
            console.log(error);
        }
      };

      useEffect(() => {
        fetchMovimientos();
        fetchProductos();
        fetchRumas();
      }, []);

      const [form, setForm] = useState({
        tipo: '',
        cantidad: 0,
        ruma_id: '',
        producto_id: '',
        motivo: '',
    });

      const createMovimiento = async () => {
        try {
            await movimientoService.create({
                tipo: form.tipo,
                cantidad: Number(form.cantidad),
                ruma_id: form.ruma_id,
                producto_id: form.producto_id,
                motivo: form.motivo
            });

            await fetchMovimientos();

            setForm({
                tipo: '',
                cantidad: 0,
                ruma_id: '',
                producto_id: '',
                motivo: '',
            });

            setIsDialogOpen(false);

        } catch (err: any) {
            console.log("ERROR COMPLETO:", err);
            console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
            toast({
                title: "Error",
                description: err?.message || "No se pudo registrar el movimiento.",
                variant: "destructive",
            });
        }
      }

  /*
  const [formData, setFormData] = useState({
    producto_id: '', tipo: '', cantidad: 0, ruma_id: '', motivo: '',
  });
  */

  const filteredMovements = movimientos.filter((m) =>
    m.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (tipo: string) => {
    if (tipo === 'entrada') return <ArrowDownCircle className="h-4 w-4 text-emerald-500" />;
    if (tipo === 'salida') return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
    if (tipo.includes('devolucion')) return <RotateCcw className="h-4 w-4 text-blue-500" />;
    return <Settings2 className="h-4 w-4 text-amber-500" />;
  };

  const getTypeBadge = (tipo: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      entrada: { variant: 'default', label: 'Entrada' },
      salida: { variant: 'destructive', label: 'Salida' },
      devolucion_buena: { variant: 'secondary', label: 'Dev. Buena' },
      devolucion_mala: { variant: 'destructive', label: 'Dev. Mala' },
      ajuste: { variant: 'outline', label: 'Ajuste' },
      desecho: { variant: 'destructive', label: 'Desecho' },
    };
    const c = map[tipo] || { variant: 'outline' as const, label: tipo };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const stats = {
    entradas: movimientos.filter(m => m.tipo === 'INGRESO').reduce((a, m) => a + Number(m.cantidad), 0),
    salidas: movimientos.filter(m => m.tipo === 'SALIDA').reduce((a, m) => a + Number(m.cantidad), 0),
    devoluciones: movimientos.filter(m => m.tipo.includes('DEVOLUCION')).reduce((a, m) => a + Number(m.cantidad), 0),
  };

  const handleSubmit = async () => {
    if (!form.producto_id || !form.tipo || form.cantidad <= 0) return;
    await createMovimiento();
    //setForm({ producto_id: '', tipo: '', cantidad: 0, ruma_id: '', motivo: '' });
    //setIsDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Movimientos de Stock</h1>
          <p className="text-muted-foreground">Registro de entradas, salidas y ajustes de inventario</p>
        </div>
        <Button className="bg-gradient-warm hover:opacity-90" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Registrar Movimiento
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="SALIDA">Salida</SelectItem>
                    <SelectItem value="DEVOLUCION_BUENA">Devolución Buena</SelectItem>
                    <SelectItem value="DEVOLUCION_MALA">Devolución Mala</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                    <SelectItem value="DESECHO">Desecho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Cantidad *</Label><Input type="number" min="1" value={form.cantidad || ''} onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select value={form.producto_id} onValueChange={(v) => setForm({ ...form, producto_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                <SelectContent>{productos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre} ({p.sku})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ruma (destino/origen)</Label>
              <Select value={form.ruma_id} onValueChange={(v) => setForm({ ...form, ruma_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ruma (opcional)" /></SelectTrigger>
                <SelectContent>{rumas.map(r => <SelectItem key={r.id} value={r.id}>{r.codigo} - {r.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Motivo</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Motivo del movimiento..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-gradient-warm hover:opacity-90">
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ArrowDownCircle className="h-6 w-6 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Entradas</p><p className="text-2xl font-bold">{stats.entradas}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><ArrowUpCircle className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Salidas</p><p className="text-2xl font-bold">{stats.salidas}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><RotateCcw className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Devoluciones</p><p className="text-2xl font-bold">{stats.devoluciones}</p></div></div></CardContent></Card>
      </div>

      <Card className="shadow-card"><CardContent className="pt-6"><div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="entrada">Entradas</SelectItem><SelectItem value="salida">Salidas</SelectItem><SelectItem value="devolucion_buena">Dev. Buena</SelectItem><SelectItem value="devolucion_mala">Dev. Mala</SelectItem><SelectItem value="ajuste">Ajustes</SelectItem><SelectItem value="desecho">Desechos</SelectItem></SelectContent></Select></div></CardContent></Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Historial de Movimientos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Producto</TableHead>
                <TableHead>Ruma</TableHead><TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-center">Stock Anterior</TableHead><TableHead className="text-center">Stock Nuevo</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{format(new Date(m.created_at), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                  <TableCell><div className="flex items-center gap-2">{getTypeIcon(m.tipo)}{getTypeBadge(m.tipo)}</div></TableCell>
                  <TableCell>{m.producto?.nombre}</TableCell>
                  <TableCell>{m.ruma?.codigo || '-'}</TableCell>
                  <TableCell className="text-center font-semibold"><span className={m.tipo === 'SALIDA' || m.tipo === 'DESECHO' || m.tipo === 'DEVOLUCION_MALA' ? 'text-red-500' : 'text-emerald-500'}>{m.tipo === 'SALIDA' || m.tipo === 'DESECHO' || m.tipo === 'DEVOLUCION_MALA' ? '-' : '+'}{Number(m.cantidad)}</span></TableCell>
                  <TableCell className="text-center text-muted-foreground">{Number(m.stock_anterior)}</TableCell>
                  <TableCell className="text-center font-medium">{Number(m.stock_post_mov)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{m.motivo || '-'}</TableCell>
                </TableRow>
              ))}
              {filteredMovements.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay movimientos registrados</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockMovements;
