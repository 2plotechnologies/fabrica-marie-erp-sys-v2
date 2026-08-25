import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle,
  Map
} from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { clienteService } from '@/services/clienteService';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/axios-error';
import { Label } from '@/components/ui/label';

interface ClientUI {
  id: number;
  razon_social: string;
  codigo: string;
  phone: string;
  address: string;
  creditLimit: number;
  currentDebt: number;
  status: string;
  ruta_id?: number | null;
  ruta_nombre?: string;
  zona?: string;
}

interface RutaOption {
  id: number;
  nombre: string;
  zona?: string;
}

interface ClientDetail {
  id: number;
  codigo_cliente: string;
  razon_social: string;
  tipo_cliente?: string;
  direccion?: string;
  telefono?: string;
  ruta_id?: number | null;
  ruta?: { id: number; nombre: string; zona?: string } | null;
  condicion_pago: string;
  limite_credito: number;
  dias_credito: number;
  deuda_actual: number;
  activo: boolean;
  status: string;
}

const ClientsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientUI[]>([]);
  const [rutas, setRutas] = useState<RutaOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [selectedRuta, setSelectedRuta] = useState<string>('ALL');

  const [detailClient, setDetailClient] = useState<ClientDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editClientId, setEditClientId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ClientDetail | null>(null);

  // 🔹 Obtener clientes y rutas desde backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientesData, rutasData] = await Promise.all([
          clienteService.getAll(),
          clienteService.getRutas(),
        ]);

        setRutas(rutasData || []);

        // Mapear datos backend → formato UI actual
        const mappedClients: ClientUI[] = (clientesData || []).map((c: any) => mapToUIClient(c));

        setClients(mappedClients);

      } catch (error: any) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "No se pudieron cargar los clientes."),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const mapToUIClient = (c: any): ClientUI => ({
    id: c.id,
    razon_social: c.razon_social,
    codigo: c.codigo_cliente,
    phone: c.telefono || '',
    address: c.direccion || '',
    creditLimit: Number(c.limite_credito || 0),
    currentDebt: Number(c.deuda_actual || 0),
    status: c.status || 'ACTIVO',
    ruta_id: c.ruta_id || c.ruta?.id || null,
    ruta_nombre: c.ruta?.nombre || '',
    zona: c.ruta?.zona || '',
  });

  // Lista única de zonas
  const zonasList = useMemo(() => {
    const set = new Set<string>();
    rutas.forEach((r) => {
      if (r.zona && r.zona.trim()) set.add(r.zona.trim());
    });
    clients.forEach((c) => {
      if (c.zona && c.zona.trim()) set.add(c.zona.trim());
    });
    return Array.from(set).sort();
  }, [rutas, clients]);

  // Lista de rutas filtradas según la zona seleccionada
  const rutasListFiltered = useMemo(() => {
    if (selectedZona === 'ALL') return rutas;
    return rutas.filter((r) => r.zona === selectedZona);
  }, [rutas, selectedZona]);

  const handleZonaChange = (val: string) => {
    setSelectedZona(val);
    setPage(1);
    if (val !== 'ALL' && selectedRuta !== 'ALL') {
      const routeObj = rutas.find((r) => String(r.id) === selectedRuta);
      if (!routeObj || routeObj.zona !== val) {
        setSelectedRuta('ALL');
      }
    }
  };

  const handleRutaChange = (val: string) => {
    setSelectedRuta(val);
    setPage(1);
  };

  // 🔹 Filtros
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || client.status === statusFilter;
    const matchesZona = selectedZona === 'ALL' || client.zona === selectedZona;
    const matchesRuta = selectedRuta === 'ALL' || String(client.ruta_id) === selectedRuta;

    return matchesSearch && matchesStatus && matchesZona && matchesRuta;
  });

  const itemsPerPage = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const paginatedClients = filteredClients.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVO: 'bg-success/10 text-success border-success/20',
      INACTIVO: 'bg-muted text-muted-foreground border-muted',
      MOROSO: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return styles[status as keyof typeof styles] || styles.INACTIVO;
  };

  const getClientById = async (clientId: number): Promise<ClientDetail | null> => {
    try {
      const data = await clienteService.getById(clientId);
      return {
        ...data,
        limite_credito: Number(data.limite_credito || 0),
        dias_credito: Number(data.dias_credito || 0),
        deuda_actual: Number(data.deuda_actual || 0),
      };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo obtener la información del cliente.'),
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleViewDetail = async (clientId: number) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    const data = await getClientById(clientId);
    setDetailClient(data);
    setDetailLoading(false);
  };

  const handleOpenEdit = async (clientId: number) => {
    setIsEditOpen(true);
    setEditLoading(true);
    const data = await getClientById(clientId);
    if (data) {
      setEditClientId(clientId);
      setEditForm(data);
    }
    setEditLoading(false);
  };

  const handleEditChange = (field: keyof ClientDetail, value: string | number | boolean | null) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const handleEditSave = async () => {
    if (!editForm || !editClientId) return;
    setEditSaving(true);
    try {
      const payload = {
        codigo_cliente: editForm.codigo_cliente,
        razon_social: editForm.razon_social,
        tipo_cliente: editForm.tipo_cliente || '',
        direccion: editForm.direccion || '',
        telefono: editForm.telefono || '',
        ruta_id: editForm.ruta_id || null,
        condicion_pago: editForm.condicion_pago,
        limite_credito: Number(editForm.limite_credito || 0),
        dias_credito: Number(editForm.dias_credito || 0),
        deuda_actual: Number(editForm.deuda_actual || 0),
        activo: Boolean(editForm.activo),
        status: editForm.status,
      };

      const updated = await clienteService.update(editClientId, payload);
      setClients((prev) => prev.map((c) => (c.id === editClientId ? mapToUIClient(updated) : c)));

      toast({
        title: 'Cliente actualizado',
        description: 'Los datos del cliente se actualizaron correctamente.',
      });

      setIsEditOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
          description: getErrorMessage(error, 'No se pudo actualizar el cliente.'),
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeactivate = async (clientId: number) => {
    const isConfirmed = window.confirm('¿Deseas desactivar este cliente?');
    if (!isConfirmed) return;

    const current = await getClientById(clientId);
    if (!current) return;

    try {
      const updated = await clienteService.update(clientId, {
        codigo_cliente: current.codigo_cliente,
        razon_social: current.razon_social,
        tipo_cliente: current.tipo_cliente || '',
        direccion: current.direccion || '',
        telefono: current.telefono || '',
        ruta_id: current.ruta_id || null,
        condicion_pago: current.condicion_pago,
        limite_credito: Number(current.limite_credito || 0),
        dias_credito: Number(current.dias_credito || 0),
        deuda_actual: Number(current.deuda_actual || 0),
        activo: false,
        status: 'INACTIVO',
      });

      setClients((prev) => prev.map((c) => (c.id === clientId ? mapToUIClient(updated) : c)));

      toast({
        title: 'Cliente desactivado',
        description: 'El cliente fue desactivado correctamente.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
          description: getErrorMessage(error, 'No se pudo desactivar el cliente.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu cartera de clientes
          </p>
        </div>
        <Button
          variant="gradient"
          className="gap-2"
          onClick={() => navigate('/clientes/nuevo')}
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total Clientes</p>
          <p className="text-2xl font-bold">{clients.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Activos</p>
          <p className="text-2xl font-bold text-success">
            {clients.filter(c => c.status === 'ACTIVO').length}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Morosos</p>
          <p className="text-2xl font-bold text-destructive">
            {clients.filter(c => c.status === 'MOROSO').length}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Deuda Total</p>
          <p className="text-2xl font-bold">
            S/ {clients.reduce((sum, c) => sum + c.currentDebt, 0).toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 animate-slide-up">
        {/* Búsqueda por texto */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o razón social..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* Filtro Zona */}
        <div className="w-full lg:w-48">
          <Select value={selectedZona} onValueChange={handleZonaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las zonas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las zonas</SelectItem>
              {zonasList.map((zona) => (
                <SelectItem key={zona} value={zona}>
                  {zona}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Ruta */}
        <div className="w-full lg:w-48">
          <Select value={selectedRuta} onValueChange={handleRutaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las rutas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las rutas</SelectItem>
              {rutasListFiltered.map((ruta) => (
                <SelectItem key={ruta.id} value={String(ruta.id)}>
                  {ruta.nombre} {ruta.zona && selectedZona === 'ALL' ? `(${ruta.zona})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado Filter Buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(null);
              setPage(1);
            }}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === 'ACTIVO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('ACTIVO');
              setPage(1);
            }}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Activos
          </Button>
          <Button
            variant={statusFilter === 'MOROSO' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('MOROSO');
              setPage(1);
            }}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Morosos
          </Button>
        </div>
      </div>

      {/* Tabla & Vista Móvil */}
      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up p-3 sm:p-0">
        {/* Mobile Card View */}
        <div className="space-y-3 sm:hidden">
          {paginatedClients.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay clientes registrados
            </div>
          ) : (
            paginatedClients.map((client) => (
              <div key={client.id} className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground break-words">{client.razon_social}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">{client.codigo}</span>
                      {client.ruta_nombre && (
                        <Badge variant="outline" className="text-[10px] py-0 h-5 bg-muted/40 font-normal truncate max-w-full">
                          <Map className="h-3 w-3 mr-1 text-muted-foreground shrink-0" />
                          <span className="truncate">{client.ruta_nombre} {client.zona ? `(${client.zona})` : ''}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(getStatusBadge(client.status), 'shrink-0')}>
                    {client.status}
                  </Badge>
                </div>

                <div className="space-y-1 pt-1 border-t border-border/50 text-muted-foreground text-[11px]">
                  {client.phone && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-1.5 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="break-words">{client.address}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/50 text-center">
                  <div className="bg-muted/40 p-1.5 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Límite Crédito</span>
                    <span className="font-bold text-foreground">S/ {client.creditLimit.toLocaleString('es-PE')}</span>
                  </div>
                  <div className="bg-muted/40 p-1.5 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Deuda Actual</span>
                    <span className={`font-bold ${client.currentDebt > 0 ? 'text-destructive' : 'text-foreground'}`}>
                      S/ {client.currentDebt.toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        Acciones <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetail(client.id)}>Ver detalle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(client.id)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={client.status === 'INACTIVO'}
                        onClick={() => handleDeactivate(client.id)}
                        className={cn(client.status !== 'INACTIVO' && 'text-destructive focus:text-destructive')}
                      >
                        Desactivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto w-full">
          <Table className="w-full min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Límite Crédito</TableHead>
                <TableHead>Deuda Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.razon_social}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">{client.codigo}</span>
                        {client.ruta_nombre && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-muted/40 font-normal">
                            <Map className="h-3 w-3 mr-1 text-muted-foreground" />
                            {client.ruta_nombre} {client.zona ? `(${client.zona})` : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {client.phone}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px]">{client.address}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    S/ {client.creditLimit.toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    S/ {client.currentDebt.toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline" className={getStatusBadge(client.status)}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(client.id)}>Ver detalle</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(client.id)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={client.status === 'INACTIVO'}
                          onClick={() => handleDeactivate(client.id)}
                          className={cn(client.status !== 'INACTIVO' && 'text-destructive focus:text-destructive')}
                        >
                          Desactivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
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

      {/* Modales responsivos */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Detalle del cliente</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Información completa del cliente seleccionado.</DialogDescription>
          </DialogHeader>

          {detailLoading && <p className="text-sm text-muted-foreground">Cargando información...</p>}

          {!detailLoading && detailClient && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm break-words min-w-0">
              <p><strong>Código:</strong> {detailClient.codigo_cliente}</p>
              <p><strong>Razón social:</strong> {detailClient.razon_social}</p>
              <p><strong>Tipo:</strong> {detailClient.tipo_cliente || '-'}</p>
              <p><strong>Teléfono:</strong> {detailClient.telefono || '-'}</p>
              <p className="sm:col-span-2"><strong>Dirección:</strong> {detailClient.direccion || '-'}</p>
              <p><strong>Ruta:</strong> {detailClient.ruta?.nombre || '-'}</p>
              <p><strong>Zona:</strong> {detailClient.ruta?.zona || '-'}</p>
              <p><strong>Condición:</strong> {detailClient.condicion_pago}</p>
              <p><strong>Días crédito:</strong> {detailClient.dias_credito}</p>
              <p><strong>Límite crédito:</strong> S/ {detailClient.limite_credito.toLocaleString('es-PE')}</p>
              <p><strong>Deuda actual:</strong> S/ {detailClient.deuda_actual.toLocaleString('es-PE')}</p>
              <p><strong>Estado:</strong> {detailClient.status}</p>
              <p><strong>Activo:</strong> {detailClient.activo ? 'Sí' : 'No'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-xl p-3 sm:p-6 rounded-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Editar cliente</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Actualiza los datos del cliente seleccionado.</DialogDescription>
          </DialogHeader>

          {editLoading && <p className="text-sm text-muted-foreground">Cargando información...</p>}

          {!editLoading && editForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código Cliente</Label>
                <Input value={editForm.codigo_cliente} onChange={(e) => handleEditChange('codigo_cliente', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Razón Social</Label>
                <Input value={editForm.razon_social} onChange={(e) => handleEditChange('razon_social', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editForm.telefono || ''} onChange={(e) => handleEditChange('telefono', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={editForm.direccion || ''} onChange={(e) => handleEditChange('direccion', e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsEditOpen(false)} disabled={editSaving}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleEditSave} disabled={editSaving || editLoading || !editForm}>
              {editSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsList;
