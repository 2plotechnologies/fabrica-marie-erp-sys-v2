/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Plus,
  Search,
  Box,
  Thermometer,
  Calendar,
  Eye,
  Pencil,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { rumaService } from '@/services/rumaService';

interface Ruma {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion_fisica: string;
  capacidad: number;
  stockActual: number;
  condiciones: string;
  estado: 'ACTIVA' | 'LLENA' | 'MANTENIMIENTO' | 'INACTIVA';
  products: RumaProduct[];
  descripcion: string;
}

interface RumaProduct {
  id: string;
  sku: string;
  nombre: string;
  cantidad: number;
}

const RumaManagement = () => {
  const { toast } = useToast();
  const [rumas, setRumas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRuma, setSelectedRuma] = useState<Ruma | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [rumaId, setRumaId] = useState<number | null>(null);

  const fetchRumas = async () => {
    try {
      setIsLoading(true);
      const data = await rumaService.getAll();
      console.log('Rumas:', data);
      setRumas(data);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener rumas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRumas();
  }, []);

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    condiciones: '',
    capacidad_unidades: '',
    ubicacion_fisica: '',
    estado: 'ACTIVA',
  });

  const filteredRumas = rumas.filter((ruma) => {
    const matchesSearch =
      ruma.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ruma.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ruma.ubicacion_fisica.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ruma.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredRumas.length / itemsPerPage);

  const paginatedRecords = filteredRumas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatusBadge = (status: Ruma['estado']) => {
    const variants: Record<Ruma['estado'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      ACTIVA: { variant: 'default', label: 'Activa' },
      LLENA: { variant: 'secondary', label: 'Llena' },
      MANTENIMIENTO: { variant: 'destructive', label: 'Mantenimiento' },
      INACTIVA: { variant: 'outline', label: 'Inactiva' },
    };
    return <Badge variant={variants[status].variant}>{variants[status].label}</Badge>;
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const stats = {
    totalRumas: rumas.length,
    activeRumas: rumas.filter(r => r.estado === 'ACTIVA').length,
    totalCapacity: rumas.reduce((sum, r) => sum + (Number(r.capacidad) || 0), 0),
    totalStock: rumas.reduce((sum, r) => sum + (Number(r.stockActual) || 0), 0),
  };

  const handleViewDetails = (ruma: Ruma) => {
    setSelectedRuma(ruma);
    setIsDetailDialogOpen(true);
  };

  const handleCreateRuma = async () => {
    if (!form.codigo || !form.nombre) return;

    try {
      await rumaService.create({
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion,
        condiciones: form.condiciones,
        capacidad_unidades: Number(form.capacidad_unidades),
        ubicacion_fisica: form.ubicacion_fisica,
        estado: form.estado,
      });

      await fetchRumas();

      setForm({
        codigo: '',
        nombre: '',
        descripcion: '',
        condiciones: '',
        capacidad_unidades: '',
        ubicacion_fisica: '',
        estado: 'ACTIVA',
      });

      setIsAddDialogOpen(false);

      toast({
        title: "Ruma creada",
        description: "La nueva ruma ha sido registrada exitosamente.",
      });

    } catch (err: any) {
      setIsAddDialogOpen(false);
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar la ruma.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: number, ruma: any) => {
    setRumaId(id);
    setForm({
      codigo: ruma.codigo,
      nombre: ruma.nombre,
      descripcion: ruma.descripcion,
      condiciones: ruma.condiciones,
      capacidad_unidades: ruma.capacidad,
      ubicacion_fisica: ruma.ubicacion_fisica,
      estado: ruma.estado,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateRuma = async () => {
    if (!form.codigo || !form.nombre) return;

    try {
      await rumaService.update(rumaId, {
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion,
        condiciones: form.condiciones,
        capacidad_unidades: Number(form.capacidad_unidades),
        ubicacion_fisica: form.ubicacion_fisica,
        estado: form.estado,
      });

      await fetchRumas();

      setForm({
        codigo: '',
        nombre: '',
        descripcion: '',
        condiciones: '',
        capacidad_unidades: '',
        ubicacion_fisica: '',
        estado: 'ACTIVA',
      });

      setIsEditDialogOpen(false);

      toast({
        title: "Ruma actualizada",
        description: "La ruma ha sido actualizada exitosamente.",
      });

    } catch (err: any) {
      setIsEditDialogOpen(false);
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar la ruma.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Gestión de Rumas
          </h1>
          <p className="text-muted-foreground">
            Control de ubicaciones y capacidades de almacenamiento
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ruma
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nueva Ruma</DialogTitle>
              <DialogDescription>
                Define las características de la nueva ubicación de almacenamiento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input placeholder="R-005"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Ruma E"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input placeholder="Almacén Central - Zona E"
                  value={form.ubicacion_fisica}
                  onChange={(e) => setForm({ ...form, ubicacion_fisica: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacidad (unidades)</Label>
                  <Input type="number" placeholder="5000" min="0"
                    value={form.capacidad_unidades}
                    onChange={(e) => setForm({ ...form, capacidad_unidades: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select defaultValue="ACTIVA"
                    value={form.estado}
                    onValueChange={(v) => setForm({ ...form, estado: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVA">Activa</SelectItem>
                      <SelectItem value="INACTIVA">Inactiva</SelectItem>
                      <SelectItem value="MANTENIMIENTO">En Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condiciones</Label>
                  <Input placeholder="18-22°C, 45-55%"
                    value={form.condiciones}
                    onChange={(e) => setForm({ ...form, condiciones: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea placeholder="Observaciones adicionales..."
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-gradient-warm hover:opacity-90" onClick={handleCreateRuma}>
                Crear Ruma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Archive className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Rumas</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalRumas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Box className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rumas Activas</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.activeRumas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacidad Total</p>
                <p className="text-2xl font-bold text-foreground">{Number(stats.totalCapacity || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Archive className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Actual</p>
                <p className="text-2xl font-bold text-foreground">{Number(stats.totalStock || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nombre o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="ACTIVA">Activa</SelectItem>
                <SelectItem value="LLENA">Llena</SelectItem>
                <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                <SelectItem value="INACTIVA">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rumas Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Lista de Rumas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre / Ubicación</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Ocupación</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((ruma) => {
                const stock = Number(ruma.stockActual ?? 0);
                const capacidad = Number(ruma.capacidad ?? 0);

                const percentage =
                  capacidad === 0 ? 0 : (stock / capacidad) * 100;
                return (
                  <TableRow key={ruma.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{ruma.codigo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ruma.nombre}</p>
                        <p className="text-xs text-muted-foreground">{ruma.ubicacion_fisica}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{ruma.stockActual.toLocaleString()}</span>
                        <span className="text-muted-foreground"> / {ruma.capacidad.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <Progress value={Math.min(percentage, 100)} className="h-2" />
                        <p className={`text-xs font-medium ${getCapacityColor(percentage)}`}>
                          {percentage.toFixed(0)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ruma.condiciones && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            {ruma.condiciones}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ruma.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(ruma)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ruma.id, ruma)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedRuma && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-primary" />
                  {selectedRuma.nombre} ({selectedRuma.codigo})
                </DialogTitle>
                <DialogDescription>
                  {selectedRuma.ubicacion_fisica}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Características */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Capacidad</p>
                    <p className="font-semibold">{selectedRuma.capacidad.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Stock Actual</p>
                    <p className="font-semibold">{selectedRuma.stockActual.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Condiciones</p>
                    <p className="font-semibold">{selectedRuma.condiciones || 'Ambiente'}</p>
                  </div>
                </div>

                {/* Productos */}
                {selectedRuma.products.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Productos en esta Ruma
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>SKU</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRuma.products.map((product, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{product.nombre}</TableCell>
                            <TableCell>{product.cantidad.toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {selectedRuma.descripcion && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Notas</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">{selectedRuma.descripcion}</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Ruma
            </DialogTitle>
            <DialogDescription>
              Editar información de la ruma
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="condiciones">Condiciones</Label>
                <Input
                  id="condiciones"
                  value={form.condiciones}
                  onChange={(e) => setForm({ ...form, condiciones: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacidad_unidades">Capacidad</Label>
                <Input
                  id="capacidad_unidades"
                  value={form.capacidad_unidades}
                  onChange={(e) => setForm({ ...form, capacidad_unidades: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ubicacion_fisica">Ubicación</Label>
                <Input
                  id="ubicacion_fisica"
                  value={form.ubicacion_fisica}
                  onChange={(e) => setForm({ ...form, ubicacion_fisica: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(value) => setForm({ ...form, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVA">Activa</SelectItem>
                    <SelectItem value="LLENA">Llena</SelectItem>
                    <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                    <SelectItem value="INACTIVA">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRuma}>
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RumaManagement;
/*

function setIsLoading(arg0: boolean) {
    throw new Error('Function not implemented.');
}

function setError(arg0: any) {
    throw new Error('Function not implemented.');
}

*/
