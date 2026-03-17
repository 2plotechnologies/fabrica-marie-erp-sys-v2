import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileCheck,
  Plus,
  Search,
  CalendarIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { regularizacionService } from '@/services/regularizacionService';
import { toast } from 'sonner';

const CashRegularization = () => {
  const [regularizaciones, setRegularizaciones] = useState<any[]>([]);
  const [cierreCajaId, setCierreCajaId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    originalClosing: '',
    realAmount: '',
    reason: '',
  });

  const getRegularizaciones = async () => {
    const response = await regularizacionService.getAll();
    setRegularizaciones(response);
  };

  useEffect(() => {
    getRegularizaciones();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      handleGetCierreCajaSinCuadrar(selectedDate);
    }
  }, [selectedDate]);

  const filteredRegularizations = regularizaciones.filter((reg) => {
    const matchesSearch = reg.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.cierre_caja.caja.usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reg.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredRegularizations.length / itemsPerPage);

  const paginatedRegularizations = filteredRegularizations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string; icon: React.ReactNode }> = {
      PENDIENTE: { variant: 'secondary', label: 'PENDIENTE', icon: <Clock className="h-3 w-3" /> },
      APROBADO: { variant: 'default', label: 'APROBADO', icon: <CheckCircle className="h-3 w-3" /> },
      RECHAZADO: { variant: 'destructive', label: 'RECHAZADO', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const { variant, label, icon } = variants[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon} {label}
      </Badge>
    );
  };

  const difference = formData.originalClosing && formData.realAmount
    ? parseFloat(formData.realAmount) - parseFloat(formData.originalClosing)
    : 0;

  const handleGetCierreCajaSinCuadrar = async (date: Date) => {
    const response = await regularizacionService.getCierreCajaSinCuadrar(format(date, "yyyy-MM-dd"));
    setCierreCajaId(response.id);
    setFormData(prev => ({ ...prev, originalClosing: response.conteo_real }));
  }

  const handleCreateRegularization = async () => {
    if (!selectedDate || !formData.originalClosing || !formData.realAmount || !formData.reason) {
      toast.error("Por favor complete todos los campos");
      return;
    }

    try {
      const response = await regularizacionService.storeRegularizacion({
        cierre_caja_id: cierreCajaId,
        fecha_regularizacion: format(selectedDate, "yyyy-MM-dd"),
        monto_cierre_original: formData.originalClosing,
        monto_real: formData.realAmount,
        motivo: formData.reason,
      });
      toast.success("Regularización creada");
      setIsAddDialogOpen(false);
      getRegularizaciones();
      setFormData({ originalClosing: '', realAmount: '', reason: '' });
      setSelectedDate(undefined);
      setCierreCajaId(null);
    } catch (error) {
      toast.error("Error al crear la regularización: " + error.response.data.message || error.response || 'Error desconocido');
    }
  };

  const handleUpdateEstadoRegularizacion = async (id: number, data: any) => {
    try {
      const response = await regularizacionService.updateEstadoRegularizacion(id, data);
      toast.success("Regularización actualizada");
      getRegularizaciones();
    } catch (error) {
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error("Error al actualizar la regularización: " + error.response.data.message || error.response || 'Error desconocido');
    }
  };

  const stats = {
    pending: regularizaciones.filter(r => r.estado === 'PENDIENTE').length,
    totalFaltante: regularizaciones
      .filter(r => Number(r.diferencia) < 0 && r.estado === 'APROBADO')
      .reduce((sum, r) => sum + Math.abs(Number(r.diferencia)), 0),
    totalSobrante: regularizaciones
      .filter(r => Number(r.diferencia) > 0 && r.estado === 'APROBADO')
      .reduce((sum, r) => sum + Number(r.diferencia), 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Regularización de Caja
          </h1>
          <p className="text-muted-foreground">
            Cuadrar diferencias de cierres de días anteriores
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-warm hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Regularización
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Crear Regularización</DialogTitle>
              <DialogDescription>
                Registra una diferencia encontrada en un cierre de caja anterior
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Fecha del Cierre</Label>
                <div className="border rounded-md p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) setSelectedDate(date);
                    }}
                    disabled={(date) => date > new Date()}
                    className="rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cierre Original (S/)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.originalClosing}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto Real (S/)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.realAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, realAmount: e.target.value }))}
                  />
                </div>
              </div>

              {formData.originalClosing && formData.realAmount && (
                <div className={cn(
                  "p-4 rounded-lg",
                  difference === 0
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : difference > 0
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Diferencia:</span>
                    <span className={cn(
                      "font-bold text-lg",
                      difference === 0
                        ? "text-emerald-600"
                        : difference > 0
                          ? "text-blue-600"
                          : "text-red-600"
                    )}>
                      {difference > 0 ? '+' : ''} S/ {difference.toFixed(2)}
                    </span>
                  </div>
                  {difference !== 0 && (
                    <p className="text-sm mt-1">
                      {difference > 0 ? 'Sobrante' : 'Faltante'}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Motivo / Justificación</Label>
                <Textarea
                  placeholder="Describe el motivo de la diferencia..."
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-gradient-warm hover:opacity-90" onClick={handleCreateRegularization}>
                Crear Regularización
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Faltantes</p>
                <p className="text-2xl font-bold text-red-600">S/ {Number(stats.totalFaltante).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ArrowUpCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sobrantes</p>
                <p className="text-2xl font-bold text-blue-600">S/ {Number(stats.totalSobrante).toFixed(2)}</p>
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
                placeholder="Buscar por motivo o responsable..."
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
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Regularizations Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Historial de Regularizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cierre Original</TableHead>
                <TableHead>Monto Real</TableHead>
                <TableHead>Diferencia</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRegularizations.map((reg) => (
                <TableRow key={reg.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {format(reg.fecha_regularizacion, "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>S/ {Number(reg.monto_cierre_original).toFixed(2)}</TableCell>
                  <TableCell>S/ {Number(reg.monto_real).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "font-medium flex items-center gap-1",
                      Number(reg.diferencia) < 0 ? "text-red-600" : "text-blue-600"
                    )}>
                      {Number(reg.diferencia) < 0 ? (
                        <ArrowDownCircle className="h-4 w-4" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4" />
                      )}
                      S/ {Math.abs(Number(reg.diferencia)).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={reg.motivo}>
                    {reg.motivo}
                  </TableCell>
                  <TableCell>{getStatusBadge(reg.estado)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{reg.cierre_caja.caja.usuario.nombre}</p>
                      {reg.usuarioAprobador?.nombre && (
                        <p className="text-xs text-muted-foreground">
                          Aprobado: {reg.usuarioAprobador.nombre}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {reg.estado === 'PENDIENTE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateEstadoRegularizacion(reg.id, { estado: 'APROBADO' })}
                      >
                        Aprobar
                      </Button>
                    )}
                    {reg.estado === 'PENDIENTE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateEstadoRegularizacion(reg.id, { estado: 'RECHAZADO' })}
                      >
                        Rechazar
                      </Button>
                    )}
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
    </div>
  );
};

export default CashRegularization;
