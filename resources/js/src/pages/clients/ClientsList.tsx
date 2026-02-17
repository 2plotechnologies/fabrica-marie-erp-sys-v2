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
import { cn } from '@/lib/utils';
import { clienteService } from '@/services/clienteService';
import { useToast } from '@/hooks/use-toast';

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

const ClientsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientUI[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
          description: error?.message || "No se pudieron cargar los clientes.",
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

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVO: 'bg-success/10 text-success border-success/20',
      INACTIVO: 'bg-muted text-muted-foreground border-muted',
      MOROSO: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return styles[status as keyof typeof styles] || styles.INACTIVO;
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
              {filteredClients.map((client) => (
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
                        <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Registrar abono</DropdownMenuItem>
                        <DropdownMenuItem>Ver historial</DropdownMenuItem>
                        <DropdownMenuItem>Desactivar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ClientsList;
