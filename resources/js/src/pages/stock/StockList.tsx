/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Search, Package, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { stockService } from '@/services/stockService';
import { movimientoService } from '@/services/movimientoStockService';
import { toast } from '@/hooks/use-toast';

type StockRuma = {
  id: number;
  codigo?: string;
  nombre?: string;
  capacidad_unidades: number;
  cantidad: number;
};

type StockItem = {
  id: number | string;
  producto_id: string;
  cantidad: number;
  capacidad_total: number;
  stock_minimo: number;
  producto?: {
    nombre?: string;
    sku?: string;
    categoria?: string;
    marca?: string;
    precio_base?: number;
    stock_minimo?: number;
  };
  rumas: StockRuma[];
};

const StockList = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [rumas, setRumas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Discard dialog state
  const [discardDialog, setDiscardDialog] = useState<{ productoId: string; nombre: string } | null>(null);
  const [discardType, setDiscardType] = useState<string>('DESECHO');
  const [discardQty, setDiscardQty] = useState('');
  const [discardRuma, setDiscardRuma] = useState<string | undefined>(undefined);
  const [discardMotivo, setDiscardMotivo] = useState('');

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const data = await stockService.getAll();
      console.log('Stock:', data);
      setStock(data);
      setPage(1);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRumas = async () => {
    try {
      const data = await stockService.getRumas();
      setRumas(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchStock();
    fetchRumas();
  }, []);

  const createMovimiento = async () => {
    try {
      await movimientoService.create({
        tipo: discardType,
        cantidad: Number(discardQty),
        ruma_id: discardRuma === "none" ? null : discardRuma,
        producto_id: discardDialog.productoId,
        motivo: discardMotivo
      });

      await fetchStock();

      setDiscardDialog(null)

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


  const filteredStock = useMemo(() => stock.filter((item) => {
    const matchesSearch =
      item.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.producto?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const min = Number(item.stock_minimo ?? item.producto?.stock_minimo ?? 0);
    const matchesLowStock = !showLowStock || (min > 0 && Number(item.cantidad) < min);
    return matchesSearch && matchesLowStock;
  }), [stock, searchTerm, showLowStock]);

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);

  const paginatedStock = filteredStock.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalValue = stock.reduce((sum, item) =>
    sum + (Number(item.cantidad) * Number(item.producto?.precio_base || 0)), 0
  );
  const lowStockCount = stock.filter((item) => {
    const min = Number(item.stock_minimo ?? item.producto?.stock_minimo ?? 0);
    return min > 0 && Number(item.cantidad) < min;
  }).length;
  const totalUnidades = stock.reduce((sum, s) => sum + Number(s.cantidad), 0);

  const getStockStatus = (qty: number, min: number, max: number) => {
    const normalizedQty = Number.isFinite(qty) ? qty : 0;
    const normalizedMin = Number.isFinite(min) ? min : 0;
    const normalizedMax = Number.isFinite(max) ? max : 0;
    const occupancy = normalizedMax > 0 ? normalizedQty / normalizedMax : 0;

    if (normalizedMin > 0 && normalizedQty <= normalizedMin) {
      return { label: 'Bajo', color: 'text-destructive' };
    }

    if ((normalizedMin > 0 && normalizedQty <= normalizedMin * 1.5) || (normalizedMax > 0 && occupancy <= 0.5)) {
      return { label: 'Regular', color: 'text-warning' };
    }

    return { label: 'Óptimo', color: 'text-success' };
  };

  const handleDiscard = async () => {
    if (!discardDialog || !discardQty || Number(discardQty) <= 0) return;
    await createMovimiento();
    setDiscardDialog(null);
    setDiscardQty('');
    setDiscardRuma('');
    setDiscardMotivo('');
    setDiscardType('DESECHO');
  };

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Stock de Productos</h1>
          <p className="text-muted-foreground mt-1">Inventario actual del almacén (alimentado por movimientos)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up">
        <div className="bg-card rounded-xl border p-4"><p className="text-sm text-muted-foreground">Total Productos</p><p className="text-2xl font-bold">{stock.length}</p></div>
        <div className="bg-card rounded-xl border p-4"><p className="text-sm text-muted-foreground">Unidades Totales</p><p className="text-2xl font-bold">{totalUnidades.toLocaleString()}</p></div>
        <div className="bg-card rounded-xl border p-4"><p className="text-sm text-muted-foreground">Bajo Mínimo</p><p className={cn("text-2xl font-bold", lowStockCount > 0 ? "text-destructive" : "text-success")}>{lowStockCount}</p></div>
        <div className="bg-card rounded-xl border p-4"><p className="text-sm text-muted-foreground">Valor Inventario</p><p className="text-2xl font-bold">S/ {totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Button variant={showLowStock ? 'destructive' : 'outline'} onClick={() => setShowLowStock(!showLowStock)} className="gap-2">
          <AlertTriangle className="h-4 w-4" />Stock Bajo ({lowStockCount})
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Cantidad</TableHead>
              <TableHead>Nivel</TableHead><TableHead>Estado</TableHead><TableHead>Valor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStock.map((item) => {
              const minStock = Number(item.stock_minimo ?? item.producto?.stock_minimo ?? 0);
              const maxStock = Number(item.capacidad_total ?? 0);
              const status = getStockStatus(Number(item.cantidad), minStock, maxStock);
              const percentage = maxStock > 0 ? (Number(item.cantidad) / maxStock) * 100 : 0;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                      <div><p className="font-medium">{item.producto?.nombre}</p><p className="text-xs text-muted-foreground">{item.producto?.categoria} • {item.producto?.marca}</p><p className="text-xs text-muted-foreground">{item.rumas.length} ruma(s){item.rumas.length > 0 ? `: ${item.rumas.map((r) => r.codigo).filter(Boolean).join(', ')}` : ''}</p></div>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{item.producto?.sku}</code></TableCell>
                  <TableCell><span className={cn("font-semibold", status.color)}>{Number(item.cantidad)}</span>{maxStock > 0 && <span className="text-xs text-muted-foreground ml-1">/ {maxStock}</span>}</TableCell>
                  <TableCell className="min-w-[120px]"><Progress value={Math.min(percentage, 100)} className="h-2" />{minStock > 0 && <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Mín: {minStock}</span><span>Máx: {maxStock}</span></div>}</TableCell>
                  <TableCell><Badge variant="outline" className={cn(
                    status.label === 'Bajo' && 'border-destructive/30 text-destructive bg-destructive/10',
                    status.label === 'Regular' && 'border-warning/30 text-warning bg-warning/10',
                    status.label === 'Óptimo' && 'border-success/30 text-success bg-success/10'
                  )}>{status.label}</Badge></TableCell>
                  <TableCell><span className="font-medium">S/ {(Number(item.cantidad) * Number(item.producto?.precio_base || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setDiscardDialog({ productoId: item.producto_id, nombre: item.producto?.nombre || '' })}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Descartar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredStock.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay stock registrado. Registra movimientos para ver stock aquí.</TableCell></TableRow>}
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

      {/* Discard Dialog */}
      <Dialog open={!!discardDialog} onOpenChange={() => setDiscardDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar Producto</DialogTitle>
            <DialogDescription>
              {discardDialog?.nombre} — Registra una baja de inventario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Descarte</Label>
              <Select value={discardType} onValueChange={setDiscardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESECHO">Devolución mala (dañada)</SelectItem>
                  <SelectItem value="DESECHO">Producto vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad a descartar</Label>
              <Input type="number" min="1" placeholder="0" value={discardQty} onChange={(e) => setDiscardQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ruma de origen (opcional)</Label>
              <Select value={discardRuma} onValueChange={setDiscardRuma}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ruma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ruma</SelectItem>
                  {rumas.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.codigo} - {r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea placeholder="Detalle del descarte..." value={discardMotivo} onChange={(e) => setDiscardMotivo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Confirmar Descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockList;
