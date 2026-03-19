import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Truck, ShoppingCart } from 'lucide-react';
import { stockService } from '@/services/stockService';
import { Button } from '@/components/ui/button';

const StockVendedoresPage = () => {
  const [stockVendedores, setStockVendedores] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [filterVendedor, setFilterVendedor] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStockVendedores = async () => {
      try {
        const data = await stockService.getStockVendedores();
        setStockVendedores(data);
      } catch (error) {
        console.error('Error al obtener stock de vendedores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchVendedores = async () => {
      try {
        const data = await stockService.getVendedores();
        setVendedores(data);
      } catch (error) {
        console.error('Error al obtener vendedores:', error);
      }
    };
    fetchStockVendedores();
    fetchVendedores();
  }, []);

  const filtered = stockVendedores.filter(sv =>
    sv.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sv.vendedor?.usuario?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedRecords = filtered.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalAsignado = stockVendedores.reduce((s, sv) => s + Number(sv.cantidad_entregada), 0);
  const totalVendido = stockVendedores.reduce((s, sv) => s + Number(sv.vendido), 0);
  const totalDisponible = stockVendedores.reduce((s, sv) => s + Number(sv.cantidad_entregada) - Number(sv.vendido), 0);

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Stock de Vendedores</h1>
        <p className="text-muted-foreground mt-1">Productos asignados a cada vendedor desde salidas de fábrica</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Truck className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Asignado</p><p className="text-2xl font-bold">{totalAsignado}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><ShoppingCart className="h-6 w-6 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Vendido</p><p className="text-2xl font-bold text-emerald-600">{totalVendido}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Package className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Disponible</p><p className="text-2xl font-bold text-blue-600">{totalDisponible}</p></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Truck className="h-6 w-6 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Vendedores</p><p className="text-2xl font-bold">{new Set(stockVendedores.map(sv => sv.vendedor_id)).size}</p></div></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" /></div>
        <Select value={filterVendedor} onValueChange={setFilterVendedor}><SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos los vendedores" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los vendedores</SelectItem>{vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.usuario?.nombre}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead>Producto</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Asignado</TableHead><TableHead className="text-right">Vendido</TableHead><TableHead className="text-right">Devuelto</TableHead><TableHead className="text-right">Disponible</TableHead></TableRow></TableHeader>
          <TableBody>
            {paginatedRecords.map(sv => (
              <TableRow key={sv.id}>
                <TableCell className="font-medium">{sv.vendedor?.usuario?.nombre} ({sv.vendedor?.id})</TableCell>
                <TableCell>{sv.producto?.nombre}<br /><span className="text-xs text-muted-foreground">{sv.producto?.marca} • {sv.producto?.presentacion}</span></TableCell>
                <TableCell className="text-sm">{sv.salida.fecha}</TableCell>
                <TableCell className="text-right font-semibold">{Number(sv.cantidad_entregada)}</TableCell>
                <TableCell className="text-right text-emerald-600 font-semibold">{Number(sv.vendido)}</TableCell>
                <TableCell className="text-right text-amber-600">{Number(sv.devuelto)}</TableCell>
                <TableCell className="text-right"><Badge variant={Number(sv.cantidad) > 0 ? 'default' : 'secondary'}>{Number(sv.cantidad)}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay stock asignado a vendedores. Crea una Salida de Fábrica y despacha.</TableCell></TableRow>}
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
    </div>
  );
};

export default StockVendedoresPage;