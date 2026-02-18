/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Cookie, Package } from 'lucide-react';
import { productoService } from '@/services/productoService';
import { toast, useToast } from '@/hooks/use-toast';

const ProductsList = () => {

  const [productos, setProductos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [form, setForm] = useState({
    sku: '',
    categoria: '',
    nombre: '',
    descripcion: '',
    presentacion: '',
    marca: '',
    unidad_medida: '',
    precio_base: '',
    costo: '',
    stock_minimo: '',
    activo: true,
  });

  /* =========================
     OBTENER PRODUCTOS
  ========================= */

  const fetchProductos = async () => {
    try {
      setIsLoading(true);
      const data = await productoService.getAll();
      console.log('Productos:', data);
      setProductos(data);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  /* =========================
     CREAR PRODUCTO
  ========================= */

  const handleCreate = async () => {
    if (!form.sku || !form.nombre) return;

    try {
      await productoService.create({
        sku: form.sku,
        categoria: form.categoria,
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        presentacion: form.presentacion || undefined,
        marca: form.marca || undefined,
        unidad_medida: form.unidad_medida,
        precio_base: Number(form.precio_base),
        costo: Number(form.costo),
        stock_minimo: Number(form.stock_minimo),
        activo: form.activo,
      });

      await fetchProductos();

      setForm({
        sku: '',
        categoria: '',
        nombre: '',
        descripcion: '',
        presentacion: '',
        marca: '',
        unidad_medida: '',
        precio_base: '',
        costo: '',
        stock_minimo: '',
        activo: true,
      });

      setIsAddDialogOpen(false);

    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
          title: "Error",
          description: err?.message || "No se pudo registrar el producto.",
          variant: "destructive",
       });
    }
  };

  /* =========================
     FILTROS
  ========================= */

 const filteredProducts = productos.filter((p) =>
    (p.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  const categories = [...new Set(productos.map(p => p.categoria))];

  /* =========================
     RENDER
  ========================= */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Productos</h1>
          <p className="text-muted-foreground">Gestiona el catálogo</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90"><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Cookie className="h-5 w-5 text-primary" />Nuevo Producto</DialogTitle>
              <DialogDescription>Agrega un nuevo producto al catálogo</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SKU *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="GAL-XXX" /></div>
                <div className="space-y-2"><Label>Categoría</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="general" /></div>
              </div>
              <div className="space-y-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Galletas de..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Rey del Centro" /></div>
                <div className="space-y-2"><Label>Presentación</Label><Input value={form.presentacion} onChange={(e) => setForm({ ...form, presentacion: e.target.value })} placeholder="5x800, 5x900..." /></div>
              </div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe el producto..." /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Unidad Medida</Label><Input value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} /></div>
                <div className="space-y-2"><Label>Stock Mínimo </Label><Input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></div>
                <div className="space-y-2"><Label>Costo (S/)</Label><Input type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} /></div>
                <div className="space-y-2"><Label>Venta (S/)</Label><Input type="number" step="0.01" value={form.precio_base} onChange={(e) => setForm({ ...form, precio_base: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button className="bg-gradient-warm hover:opacity-90" onClick={handleCreate}>
                {'Guardar Producto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Package className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Productos</p><p className="text-2xl font-bold text-foreground">{productos.length}</p></div></div></CardContent></Card>
        {categories.slice(0, 3).map((cat) => (
          <Card key={cat} className="shadow-card"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-cookie-100 dark:bg-cookie-900/30 flex items-center justify-center"><Cookie className="h-6 w-6 text-cookie-600" /></div><div><p className="text-sm text-muted-foreground">{cat}</p><p className="text-2xl font-bold text-foreground">{productos.filter(p => p.categoria === cat).length}</p></div></div></CardContent></Card>
        ))}
      </div>

      {/* BUSCADOR */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* TABLA */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Presentación</TableHead>
                <TableHead>Precio Base</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Stock Mínimo</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell>{p.presentacion}</TableCell>
                  <TableCell>S/ {Number(p.precio_base).toFixed(2)}</TableCell>
                  <TableCell>S/ {Number(p.costo).toFixed(2)}</TableCell>
                  <TableCell>{p.stock_minimo}</TableCell>
                </TableRow>
              ))}

              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No hay productos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};

export default ProductsList;
