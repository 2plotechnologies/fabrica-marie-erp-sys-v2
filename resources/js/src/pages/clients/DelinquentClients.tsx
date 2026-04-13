import React, { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { Search, AlertTriangle, Phone, Ban, History, DollarSign, MapPin, List } from 'lucide-react';
import { clienteService } from '@/services/clienteService';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/axios-error';

interface Moroso {
  id: number;
  razon_social: string;
  telefono: string;
  direccion: string;
  ruta_nombre: string;
  overdueAmount: number;
  overdueCount: number;
  overdueDays: number;
}

const DelinquentClients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupByRoute, setGroupByRoute] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Moroso[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchMorosos();
  }, []);

  const fetchMorosos = async () => {
    try {
      setLoading(true);
      const data = await clienteService.getMorosos();
      setClients(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.razon_social.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOverdue = clients.reduce((acc, c) => acc + c.overdueAmount, 0);
  const avgDaysOverdue = clients.length > 0
    ? Math.round(clients.reduce((acc, c) => acc + c.overdueDays, 0) / clients.length)
    : 0;

  const getRiskLevel = (days: number) => {
    if (days > 60) return { label: 'Alto', variant: 'destructive' as const };
    if (days > 30) return { label: 'Medio', variant: 'secondary' as const };
    return { label: 'Bajo', variant: 'outline' as const };
  };

  // Grouping logic
  const groupedClients = filteredClients.reduce((groups, client) => {
    const route = client.ruta_nombre || 'Sin Ruta';
    if (!groups[route]) {
      groups[route] = [];
    }
    groups[route].push(client);
    return groups;
  }, {} as Record<string, Moroso[]>);

  const renderClientRow = (client: Moroso) => {
    const risk = getRiskLevel(client.overdueDays);
    return (
      <TableRow key={client.id} className="hover:bg-muted/50">
        <TableCell>
          <div>
            <p className="font-medium">{client.razon_social}</p>
            <p className="text-xs text-muted-foreground">{client.ruta_nombre}</p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {client.telefono || 'Sin teléfono'}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">{client.overdueCount}</Badge>
        </TableCell>
        <TableCell className="text-center font-semibold text-red-600">
          {client.overdueDays} días
        </TableCell>
        <TableCell>
          <Badge variant={risk.variant}>{risk.label}</Badge>
        </TableCell>
        <TableCell className="text-right font-bold text-red-600">
          S/ {Number(client.overdueAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-1" />
                  Contactar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Información de Contacto</DialogTitle>
                  <DialogDescription>
                    {client.razon_social}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{client.telefono || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="font-medium">{client.direccion || 'Sin dirección'}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Resumen de Deuda</p>
                    <div className="flex justify-between text-lg">
                      <span>Total vencido:</span>
                      <span className="font-bold text-red-600">
                        S/ {Number(client.overdueAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Clientes Morosos
          </h1>
          <p className="text-muted-foreground">
            Gestión de clientes con deudas vencidas
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-400">
                Atención: {clients.length} clientes con deudas vencidas
              </h3>
              <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                Total pendiente: <span className="font-bold">S/ {totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {' · '}
                Promedio de días vencidos: <span className="font-bold">{avgDaysOverdue} días</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes Morosos</p>
                <p className="text-2xl font-bold text-foreground">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deuda Vencida</p>
                <p className="text-2xl font-bold text-red-600">
                  S/ {totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Días Promedio</p>
                <p className="text-2xl font-bold text-foreground">{avgDaysOverdue} días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Actions */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente moroso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={groupByRoute ? "default" : "outline"}
                onClick={() => setGroupByRoute(true)}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Agrupar por Ruta
              </Button>
              <Button
                variant={!groupByRoute ? "default" : "outline"}
                onClick={() => setGroupByRoute(false)}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Lista Simple
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Content */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Lista de Morosos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Cargando morosos...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No se encontraron clientes morosos.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-center">Cuentas Vencidas</TableHead>
                  <TableHead className="text-center">Días Vencido</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead className="text-right">Deuda Vencida</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!groupByRoute ? (
                  filteredClients.map(renderClientRow)
                ) : (
                  Object.entries(groupedClients).map(([route, routeClients]) => (
                    <React.Fragment key={route}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7}>
                          <div className="flex items-center gap-2 font-bold text-primary">
                            <MapPin className="h-4 w-4" />
                            {route} ({routeClients.length} clientes)
                          </div>
                        </TableCell>
                      </TableRow>
                      {routeClients.map(renderClientRow)}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DelinquentClients;
