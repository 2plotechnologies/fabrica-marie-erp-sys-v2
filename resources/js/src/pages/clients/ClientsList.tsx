/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle
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
}

interface ClientDetail {
  id: number;
  codigo_cliente: string;
  razon_social: string;
  tipo_cliente?: string;
  direccion?: string;
  telefono?: string;
  ruta_id?: number | null;
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
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [detailClient, setDetailClient] = useState<ClientDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editClientId, setEditClientId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ClientDetail | null>(null);

  // 🔹 Obtener clientes desde backend
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const data = await clienteService.getAll();

        // Mapear datos backend → formato UI actual
        const mappedClients: ClientUI[] = data.map((c: any) => ({
          id: c.id,
          razon_social: c.razon_social,
          codigo: c.codigo_cliente,
          phone: c.telefono || '',
          address: c.direccion || '',
          creditLimit: Number(c.limite_credito || 0),
          currentDebt: Number(c.deuda_actual || 0),
          status: c.status || 'ACTIVO',
        }));

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

    fetchClientes();
  }, []);

  // 🔹 Filtros (NO modificados)
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || client.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const mapToUIClient = (c: any): ClientUI => ({
    id: c.id,
    razon_social: c.razon_social,
    codigo: c.codigo_cliente,
    phone: c.telefono || '',
    address: c.direccion || '',
    creditLimit: Number(c.limite_credito || 0),
    currentDebt: Number(c.deuda_actual || 0),
    status: c.status || 'ACTIVO',
  });

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

      {/* Filters (SIN CAMBIOS) */}
      <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o razón social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === 'ACTIVO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ACTIVO')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Activos
          </Button>
          <Button
            variant={statusFilter === 'MOROSO' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('MOROSO')}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Morosos
          </Button>
        </div>
      </div>

      {/* Tabla (SIN CAMBIOS VISUALES) */}
      <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <Table>
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
                      <p className="text-sm text-muted-foreground">{client.codigo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {client.phone}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{client.address}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    S/ {client.creditLimit.toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    S/ {client.currentDebt.toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(client.status)}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del cliente</DialogTitle>
            <DialogDescription>Información completa del cliente seleccionado.</DialogDescription>
          </DialogHeader>

          {detailLoading && <p className="text-sm text-muted-foreground">Cargando información...</p>}

          {!detailLoading && detailClient && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p><strong>Código:</strong> {detailClient.codigo_cliente}</p>
              <p><strong>Razón social:</strong> {detailClient.razon_social}</p>
              <p><strong>Tipo:</strong> {detailClient.tipo_cliente || '-'}</p>
              <p><strong>Teléfono:</strong> {detailClient.telefono || '-'}</p>
              <p className="sm:col-span-2"><strong>Dirección:</strong> {detailClient.direccion || '-'}</p>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Actualiza los datos del cliente seleccionado.</DialogDescription>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={editSaving || editLoading || !editForm}>
              {editSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsList;
