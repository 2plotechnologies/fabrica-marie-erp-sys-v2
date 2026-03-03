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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Wrench,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { mantenimientoService } from '@/services/mantenimientoService';
import { vehiculoService } from '@/services/vehiculoService';

const MaintenanceList = () => {
  const { toast } = useToast();
  const [mantenimientos, setMantenimientos] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMantenimientos = async () => {
      try {
          setIsLoading(true);
          const data = await mantenimientoService.getAll();
          console.log('Mantenimientos:', data);
          setMantenimientos(data);
      } catch (err: any) {
          setError(err?.message || 'Error al obtener mantenimientos.');
      } finally {
          setIsLoading(false);
      }
  };

  const fetchVehiculos = async () => {
    try {
        const data = await vehiculoService.getAll();
        console.log('Vehiculos:', data);
        setVehiculos(data);
    } catch (err: any) {
        setError(err?.message || 'Error al obtener vehiculos.');
    }
  };

  useEffect(() => {
      fetchMantenimientos();
      fetchVehiculos();
  }, []);

  const [form, setForm] = useState({
    tipo: '',
    descripcion: '',
    fecha_programada: '',
    costo_estimado: '',
    taller: '',
    vehiculo_id: '',
    estado: 'PENDIENTE',
  });

  const filteredRecords = mantenimientos.filter((record) => {
    const matchesSearch =
      record.vehiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehiculo.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      PENDIENTE: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" />, label: 'Pendiente' },
      EN_PROCESO: { variant: 'outline', icon: <Wrench className="h-3 w-3 mr-1" />, label: 'En Proceso' },
      COMPLETADO: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" />, label: 'Completado' },
    };
    const config = variants[status] || { variant: 'outline', icon: null, label: status };
    return (
      <Badge variant={config.variant} className="flex items-center">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'PREVENTIVO' ? 'secondary' : 'destructive'}>
        {type === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo'}
      </Badge>
    );
  };

  const handleAddMaintenance = async () => {
    if (!form.tipo || !form.fecha_programada) return;

    try{
        await mantenimientoService.create({
            tipo: form.tipo,
            descripcion: form.descripcion,
            fecha_programada: form.fecha_programada,
            costo_estimado: form.costo_estimado,
            taller: form.taller,
            vehiculo_id: Number(form.vehiculo_id),
            estado: form.estado,
        });

        await fetchMantenimientos();

        setForm({
            tipo: '',
            descripcion: '',
            fecha_programada: '',
            costo_estimado: '',
            taller: '',
            vehiculo_id: '',
            estado: 'PENDIENTE',
        });

        toast({
            title: "Mantenimiento programado",
            description: "El mantenimiento ha sido registrado correctamente",
        });
        setIsAddDialogOpen(false);

    }catch(err: any){
        setIsAddDialogOpen(false);
        console.log("ERROR COMPLETO:", err);
        console.log("RESPUESTA DEL SERVIDOR:", err.response?.data);
        toast({
            title: "Error",
            description: err?.message || "No se pudo programar el mantenimiento.",
            variant: "destructive",
        });
    }

  };

  const stats = {
    total: mantenimientos.length,
    pending: mantenimientos.filter(m => m.estado === 'PENDIENTE').length,
    inProcess: mantenimientos.filter(m => m.estado === 'EN_PROCESO').length,
    totalCost: mantenimientos.reduce((acc, m) => acc + Number(m.costo_estimado), 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Mantenimiento de Vehículos
          </h1>
          <p className="text-muted-foreground">
            Control de mantenimientos preventivos y correctivos
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Programar Mantenimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Programar Mantenimiento</DialogTitle>
              <DialogDescription>
                Registra un nuevo mantenimiento para un vehículo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vehículo</Label>
                  <Select value={form.vehiculo_id}
                          onValueChange={v => setForm({ ...form, vehiculo_id: v })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa}</SelectItem>)}
                        </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo}
                          onValueChange={v => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                      <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.descripcion}
                placeholder="Detalle del trabajo a realizar..." onChange={e => setForm({ ...form, descripcion: e.target.value })}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Programada</Label>
                  <Input type="date" value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })}/>
                </div>
                <div className="space-y-2">
                  <Label>Costo Estimado (S/)</Label>
                  <Input type="number" placeholder="0.00"
                  value={form.costo_estimado} onChange={e => setForm({ ...form, costo_estimado: e.target.value })}/>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taller / Técnico</Label>
                <Input placeholder="Nombre del taller o técnico"
                value={form.taller} onChange={e => setForm({ ...form, taller: e.target.value })}/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-gradient-warm hover:opacity-90" onClick={handleAddMaintenance}>
                Programar
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
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Proceso</p>
                <p className="text-2xl font-bold text-foreground">{stats.inProcess}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Costo Total</p>
                <p className="text-2xl font-bold text-foreground">
                  S/ {stats.totalCost.toLocaleString()}
                </p>
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
                placeholder="Buscar por placa, vehículo o descripción..."
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
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                <SelectItem value="COMPLETADO">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historial de Mantenimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {record.vehiculo.placa}
                        </code>
                        <p className="text-sm text-muted-foreground">{record.vehiculo.marca}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(record.tipo)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.descripcion}</p>
                      <p className="text-xs text-muted-foreground">{record.taller}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(record.fecha_programada, "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.estado)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    S/ {Number(record.costo_estimado).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceList;
