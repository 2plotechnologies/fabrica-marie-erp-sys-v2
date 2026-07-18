/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Truck,
  Plus,
  Wrench,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Pencil,
  User,
  Users,
  Trash2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Vehicle } from '@/types';
import { mockUsers } from '@/data/mockData';
import { vehiculoService } from '@/services/vehiculoService';
import { toast } from '@/hooks/use-toast';

const VehiclesList = () => {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [vehicleToDeactivate, setVehicleToDeactivate] = useState<any>(null);

  const filteredVehicles = vehiculos.filter((vehicle) => {
    const matchesSearch =
      vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 4;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);

  const paginatedVehicles = filteredVehicles.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const fetchVehiculos = async () => {
    try {
      setIsLoading(true);
      const data = await vehiculoService.getAll();
      console.log('Vehiculos:', data);
      setVehiculos(data);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener vehiculos.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const data = await vehiculoService.getVendedores();
      console.log('Vendedores:', data);
      setVendedores(data);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener vendedores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
    fetchVendedores();
  }, []);

  const [form, setForm] = useState({
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    chofer: '',
    anio: '',
    estado: 'DISPONIBLE',
    activo: 1
  });

  const [assignForm, setAssignForm] = useState({
    vendedor_id: '',
  });

  const handleCreateVehiculo = async () => {
    if (!form.placa || !form.marca) return;

    try {
      await vehiculoService.create({
        placa: form.placa,
        tipo: form.tipo,
        marca: form.marca,
        modelo: form.modelo,
        chofer: form.chofer,
        anio: form.anio,
        estado: form.estado,
        activo: form.activo
      });

      await fetchVehiculos();

      setForm({
        placa: '',
        tipo: '',
        marca: '',
        modelo: '',
        chofer: '',
        anio: '',
        estado: 'DISPONIBLE',
        activo: 1
      });

      setIsAddDialogOpen(false);

      toast({
        title: "Vehiculo creado",
        description: "El nuevo vehiculo ha sido registrado exitosamente.",
      });

    } catch (err: any) {
      setIsAddDialogOpen(false);
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar el vehiculo.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      DISPONIBLE: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" />, label: 'Disponible' },
      EN_RUTA: { variant: 'secondary', icon: <MapPin className="h-3 w-3 mr-1" />, label: 'En Ruta' },
      MANTENIMIENTO: { variant: 'destructive', icon: <Wrench className="h-3 w-3 mr-1" />, label: 'Mantenimiento' },
    };
    const config = variants[status] || { variant: 'outline', icon: null, label: status };
    return (
      <Badge variant={config.variant} className="flex items-center">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getMaintenanceStatus = (nextMaintenance?: string) => {
    if (!nextMaintenance) return null;

    const maintenanceDate = new Date(nextMaintenance);
    const daysUntil = differenceInDays(maintenanceDate, new Date());

    if (daysUntil < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-amber-500">Próximo ({daysUntil}d)</Badge>;
    }

    return <span className="text-muted-foreground">{daysUntil} días</span>;
  };

  const stats = {
    total: vehiculos.length,
    available: vehiculos.filter(v => v.estado === 'DISPONIBLE').length,
    inRoute: vehiculos.filter(v => v.estado === 'EN_RUTA').length,
    maintenance: vehiculos.filter(v => v.estado === 'MANTENIMIENTO').length,
  };

  const handleAssignVendedor = (vehicleId: string) => {
    // Abrir dialog para asignar vendedor
    setIsAssignDialogOpen(true);
    setVehicleId(vehicleId);
  };

  const handleAsignarVendedor = async () => {
    try {
      await vehiculoService.assignVendedor(assignForm.vendedor_id, vehicleId);
      await fetchVehiculos();
      setAssignForm({
        vendedor_id: '',
      });
      setIsAssignDialogOpen(false);
      toast({
        title: "Vendedor asignado",
        description: "El vendedor ha sido asignado exitosamente.",
      });
    } catch (err: any) {
      setIsAssignDialogOpen(false);
      console.log("ERROR COMPLETO:", err);
      console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
      toast({
        title: "Error",
        description: "No se pudo asignar el vendedor: " + err.response?.data.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenEditDialog = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setForm({
      placa: vehicle.placa || '',
      tipo: vehicle.tipo || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      chofer: vehicle.chofer || '',
      anio: vehicle.anio?.toString() || '',
      estado: vehicle.estado || 'DISPONIBLE',
      activo: vehicle.activo !== undefined ? vehicle.activo : 1
    });
    setIsEditDialogOpen(true);
  };

  const handleEditVehiculo = async () => {
    if (!selectedVehicle?.id || !form.placa || !form.marca) return;

    try {
      await vehiculoService.update(selectedVehicle.id, {
        placa: form.placa,
        tipo: form.tipo,
        marca: form.marca,
        modelo: form.modelo,
        chofer: form.chofer,
        anio: form.anio,
        estado: form.estado,
        activo: form.activo
      });

      await fetchVehiculos();
      setIsEditDialogOpen(false);
      setSelectedVehicle(null);
      setForm({
        placa: '',
        tipo: '',
        marca: '',
        modelo: '',
        chofer: '',
        anio: '',
        estado: 'DISPONIBLE',
        activo: 1
      });

      toast({
        title: "Vehículo actualizado",
        description: "El vehículo ha sido actualizado exitosamente.",
      });

    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar el vehículo.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDeactivateDialog = (vehicle: any) => {
    setVehicleToDeactivate(vehicle);
    setIsDeactivateDialogOpen(true);
  };

  const handleDeactivateVehiculo = async () => {
    if (!vehicleToDeactivate?.id) return;

    try {
      await vehiculoService.delete(vehicleToDeactivate.id);
      await fetchVehiculos();
      setIsDeactivateDialogOpen(false);
      setVehicleToDeactivate(null);
      toast({
        title: "Vehículo desactivado",
        description: "El vehículo ha sido desactivado exitosamente.",
      });
    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      toast({
        title: "Error",
        description: err?.message || "No se pudo desactivar el vehículo.",
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
            Flota de Vehículos
          </h1>
          <p className="text-muted-foreground">
            Gestión de vehículos y unidades de reparto
          </p>
        </div>
        {/*Dialog para asignar vendedor*/}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Vendedor</DialogTitle>
              <DialogDescription>
                Selecciona el vendedor que venderá con este vehículo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor">Vendedor</Label>
                  <Select value={assignForm.vendedor_id}
                    onValueChange={(v) => setAssignForm({ ...assignForm, vendedor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.usuario.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAsignarVendedor}>
                Asignar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Vehículo</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo vehículo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input id="plate" placeholder="ABC-123"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={form.tipo}
                    onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camioneta">Camioneta</SelectItem>
                      <SelectItem value="furgon">Furgón</SelectItem>
                      <SelectItem value="camion">Camión Ligero</SelectItem>
                      <SelectItem value="minivan">Minivan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input id="brand" placeholder="Toyota" value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input id="model" placeholder="Hilux" value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chofer">Chofer</Label>
                  <Input id="chofer" placeholder="Juan" value={form.chofer}
                    onChange={(e) => setForm({ ...form, chofer: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <Input id="year" type="number" placeholder="2024"
                    value={form.anio}
                    onChange={(e) => setForm({ ...form, anio: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-gradient-warm hover:opacity-90" onClick={handleCreateVehiculo}>
                Guardar
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
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vehículos</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Ruta</p>
                <p className="text-2xl font-bold text-foreground">{stats.inRoute}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Mantenimiento</p>
                <p className="text-2xl font-bold text-foreground">{stats.maintenance}</p>
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
                placeholder="Buscar por placa, marca o modelo..."
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="EN_RUTA">En Ruta</SelectItem>
                <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Lista de Vehículos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Chofer</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Próximo Mant.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} className="hover:bg-muted/50">
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-bold">
                      {vehicle.placa}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vehicle.marca} {vehicle.modelo}</p>
                      <p className="text-xs text-muted-foreground">Año {vehicle.anio}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{vehicle.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{vehicle.chofer}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(vehicle.estado) || 'Sin Estado'}
                  </TableCell>
                  <TableCell>
                    {/*Mostrar solo si hay manteminiento con estado PENDIENTE O EN_PROCESO*/}
                    {vehicle.mantenimientos.filter((m: any) => m.estado === 'PENDIENTE' || m.estado === 'EN_PROCESO').length > 0 ? getMaintenanceStatus(vehicle.mantenimientos[0]?.fecha_programada) : 'Sin mantenimientos'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/*Asignar vendedor*/}
                      <Button variant="ghost" size="icon" onClick={() => handleAssignVendedor(vehicle.id)}>
                        <User className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(vehicle)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDeactivateDialog(vehicle)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
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
        </CardContent>
      </Card>

      {/* Dialog para editar vehículo */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setForm({
            placa: '',
            tipo: '',
            marca: '',
            modelo: '',
            chofer: '',
            anio: '',
            estado: 'DISPONIBLE',
            activo: 1
          });
          setSelectedVehicle(null);
        }
        setIsEditDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Vehículo</DialogTitle>
            <DialogDescription>
              Modifica los datos del vehículo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-plate">Placa</Label>
                <Input id="edit-plate" placeholder="ABC-123"
                  value={form.placa}
                  onChange={(e) => setForm({ ...form, placa: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Tipo</Label>
                <Select value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camioneta">Camioneta</SelectItem>
                    <SelectItem value="furgon">Furgón</SelectItem>
                    <SelectItem value="camion">Camión Ligero</SelectItem>
                    <SelectItem value="minivan">Minivan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marca</Label>
                <Input id="edit-brand" placeholder="Toyota" value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Modelo</Label>
                <Input id="edit-model" placeholder="Hilux" value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-chofer">Chofer</Label>
                <Input id="edit-chofer" placeholder="Juan" value={form.chofer}
                  onChange={(e) => setForm({ ...form, chofer: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-year">Año</Label>
                <Input id="edit-year" type="number" placeholder="2024"
                  value={form.anio}
                  onChange={(e) => setForm({ ...form, anio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-estado">Estado</Label>
                <Select value={form.estado}
                  onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger id="edit-estado">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                    <SelectItem value="EN_RUTA">En Ruta</SelectItem>
                    <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-gradient-warm hover:opacity-90" onClick={handleEditVehiculo}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar desactivación */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar Vehículo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar el vehículo con placa <strong>{vehicleToDeactivate?.placa}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeactivateVehiculo}>
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehiclesList;
