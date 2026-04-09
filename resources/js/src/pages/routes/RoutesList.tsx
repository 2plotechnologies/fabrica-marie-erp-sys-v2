/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Users,
  CheckCircle,
  Clock,
  MoreHorizontal,
  List,
  Map
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import RouteMap from '@/components/routes/RouteMap';
import NewRouteDialog from '@/components/routes/NewRouteDialog';
import { rutaService } from '@/services/rutaService';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/axios-error';

const RoutesList = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('list');
  const [showNewRouteDialog, setShowNewRouteDialog] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [detailRoute, setDetailRoute] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignRouteId, setReassignRouteId] = useState<number | null>(null);
  const [reassignSellerId, setReassignSellerId] = useState<string>('');
  const [clientsRouteName, setClientsRouteName] = useState('');
  const [routeClients, setRouteClients] = useState<any[]>([]);
  const [isClientsOpen, setIsClientsOpen] = useState(false);

  const getAssignedSeller = (sellerId?: number) => {
    return vendedores.find(u => u.id === sellerId);
  };

  const handleRouteCreated = (newRoute: any) => {
    setRoutes(prev => [...prev, newRoute]);
  };

  const fetchRutas = async () => {
    try {
      const data = await rutaService.getAll();
      setRoutes(data);
      setIsLoading(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudieron cargar las rutas.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const data = await rutaService.getVendedores();
      setVendedores(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudieron cargar los vendedores.'),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchRutas();
    fetchVendedores();
  }, []);

  const coveragePromedio = useMemo(() => {
    const totalEstimados = routes.reduce(
      (sum, r) => sum + (r.clientes_estimados || 0),
      0
    );

    const totalReales = routes.reduce(
      (sum, r) => sum + (r.clientes_count || 0),
      0
    );

    return totalEstimados > 0
      ? (totalReales / totalEstimados) * 100
      : 0;
  }, [routes]);

  const handleViewDetail = async (routeId: number) => {
    try {
      const data = await rutaService.getDetail(routeId);
      setDetailRoute(data);
      setIsDetailOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo obtener el detalle de la ruta.'), variant: 'destructive' });
    }
  };

  const handleOpenEdit = async (routeId: number) => {
    try {
      const data = await rutaService.getById(routeId);
      setEditRoute(data);
      setIsEditOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo cargar la ruta para edición.'), variant: 'destructive' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editRoute?.id) return;

    try {
      const payload = {
        nombre: editRoute.nombre,
        zona: editRoute.zona,
        descripcion: editRoute.descripcion,
        frecuencia: editRoute.frecuencia,
        vendedor_id: editRoute.vendedor_id,
        clientes_estimados: Number(editRoute.clientes_estimados || 0),
      };

      const updated = await rutaService.update(editRoute.id, payload);
      setRoutes((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setIsEditOpen(false);
      toast({ title: 'Ruta actualizada', description: 'Los cambios fueron guardados.' });
    } catch (error: any) {
      toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo actualizar la ruta.'), variant: 'destructive' });
    }
  };

  const handleOpenReassign = (routeId: number, currentSellerId?: number) => {
    setReassignRouteId(routeId);
    setReassignSellerId(currentSellerId ? String(currentSellerId) : '');
    setIsReassignOpen(true);
  };

  const handleReassignSeller = async () => {
    if (!reassignRouteId) return;

    try {
      const updated = await rutaService.reassignSeller(reassignRouteId, {
        vendedor_id: reassignSellerId ? Number(reassignSellerId) : null,
      });

      setRoutes((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setIsReassignOpen(false);
      toast({ title: 'Vendedor reasignado', description: 'La ruta fue actualizada correctamente.' });
    } catch (error: any) {
      toast({ title: 'Error', description: getErrorMessage(error, 'No se pudo reasignar el vendedor.'), variant: 'destructive' });
    }
  };

  const handleViewClients = async (routeId: number, routeName: string) => {
    try {
      const clients = await rutaService.getClientes(routeId);
      setClientsRouteName(routeName);
      setRouteClients(clients);
      setIsClientsOpen(true);
    } catch (error: any) {
      toast({ title: 'Error', description: getErrorMessage(error, 'No se pudieron cargar los clientes de la ruta.'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Rutas de Venta</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las rutas y asignaciones de vendedores
          </p>
        </div>
        <Button variant="gradient" className="gap-2" onClick={() => setShowNewRouteDialog(true)}>
          <MapPin className="h-4 w-4" />
          Nueva Ruta
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Lista de Rutas
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <Map className="h-4 w-4" />
            Mapa Interactivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Rutas Activas</p>
              <p className="text-2xl font-bold">
                {routes.filter(r => r.activo).length}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold">
                {routes.reduce((sum, r) => sum + (r.clientes_count || 0), 0)}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Vendedores Asignados</p>
              <p className="text-2xl font-bold">
                {routes.filter(r => r.vendedor_id).length}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Cobertura Promedio</p>
              <p className={`text-2xl font-bold ${coveragePromedio >= 80
                  ? 'text-success'
                  : coveragePromedio >= 50
                    ? 'text-warning'
                    : 'text-destructive'
                }`}>
                {coveragePromedio.toFixed(0)}%
              </p>
            </div>
          </div>

          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((route, index) => {
                const seller = getAssignedSeller(route.vendedor_id);
                const coverage = route.clientes_estimados > 0 ? Math.min((route.clientes_count / route.clientes_estimados) * 100, 100) : 0;

                return (
                  <div
                    key={route.id}
                    className="bg-card rounded-xl border shadow-card p-5 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${200 + index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-12 w-12 rounded-xl flex items-center justify-center',
                          route.zona === 'Huancayo' && 'bg-info/10',
                          route.zona === 'El Tambo' && 'bg-success/10',
                          route.zona === 'Chilca' && 'bg-warning/10',
                          route.zona === 'Pilcomayo' && 'bg-primary/10',
                          route.zona === 'Huancan' && 'bg-secondary/10',
                        )}>
                          <MapPin className={cn(
                            'h-6 w-6',
                            route.zona === 'Huancayo' && 'text-info',
                            route.zona === 'El Tambo' && 'text-success',
                            route.zona === 'Chilca' && 'text-warning',
                            route.zona === 'Pilcomayo' && 'text-primary',
                            route.zona === 'Huancan' && 'text-secondary',
                          )} />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold">{route.nombre}</h3>
                          <p className="text-sm text-muted-foreground">Zona {route.zona}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(route.id)}>Ver detalle</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(route.id)}>Editar ruta</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenReassign(route.id, route.vendedor_id)}>Reasignar vendedor</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewClients(route.id, route.nombre)}>Ver clientes</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {seller ? (
                            <span className="text-xs font-medium text-primary">
                              {seller.usuario.nombre[0]}
                            </span>
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {seller ? (
                            <>
                              <p className="text-sm font-medium truncate">
                                {seller.usuario.nombre}
                              </p>
                              <p className="text-xs text-muted-foreground">Vendedor</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sin asignar</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 rounded-lg bg-secondary/30">
                          <p className="text-lg font-bold">{route.clientes_count}</p>
                          <p className="text-xs text-muted-foreground">Clientes</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-secondary/30">
                          <p className="text-lg font-bold">{Math.round(coverage)}%</p>
                          <p className="text-xs text-muted-foreground">Cobertura</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Covertura</span>
                          <span className={cn(
                            'font-medium',
                            coverage >= 80 ? 'text-success' : coverage >= 60 ? 'text-warning' : 'text-destructive'
                          )}>
                            {Math.round(coverage)}%
                          </span>
                        </div>
                        <Progress
                          value={coverage}
                          className={cn(
                            'h-2',
                            coverage >= 80 && '[&>div]:bg-success',
                            coverage >= 60 && coverage < 80 && '[&>div]:bg-warning',
                            coverage < 60 && '[&>div]:bg-destructive'
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <Badge
                          variant="outline"
                          className={cn(
                            route.activo
                              ? 'border-success/30 text-success bg-success/10'
                              : 'border-muted text-muted-foreground'
                          )}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {route.activo ? 'ACTIVA' : 'INACTIVA'}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Última actualización: Hoy
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <RouteMap routes={routes} onRoutesChange={setRoutes} />
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de ruta</DialogTitle>
          </DialogHeader>
          {detailRoute && (
            <div className="space-y-2 text-sm">
              <p><strong>Nombre:</strong> {detailRoute.nombre}</p>
              <p><strong>Zona:</strong> {detailRoute.zona}</p>
              <p><strong>Frecuencia:</strong> {detailRoute.frecuencia}</p>
              <p><strong>Descripción:</strong> {detailRoute.descripcion || '-'}</p>
              <p><strong>Clientes:</strong> {detailRoute.clientes_count || detailRoute.clientes?.length || 0}</p>
              <p><strong>Vendedor:</strong> {detailRoute.vendedor?.usuario?.nombre || 'Sin asignar'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar ruta</DialogTitle>
          </DialogHeader>
          {editRoute && (
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={editRoute.nombre || ''} onChange={(e) => setEditRoute({ ...editRoute, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Zona</Label>
                <Input value={editRoute.zona || ''} onChange={(e) => setEditRoute({ ...editRoute, zona: e.target.value })} />
              </div>
              <div>
                <Label>Frecuencia</Label>
                <Input value={editRoute.frecuencia || ''} onChange={(e) => setEditRoute({ ...editRoute, frecuencia: e.target.value })} />
              </div>
              <div>
                <Label>Clientes estimados</Label>
                <Input type="number" value={editRoute.clientes_estimados || 0} onChange={(e) => setEditRoute({ ...editRoute, clientes_estimados: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Vendedor</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={reassignSellerId}
              onChange={(e) => setReassignSellerId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.usuario.nombre}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Cancelar</Button>
            <Button onClick={handleReassignSeller}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClientsOpen} onOpenChange={setIsClientsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clientes de la ruta: {clientsRouteName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {routeClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay clientes asignados.</p>
            ) : (
              routeClients.map((c) => (
                <div key={c.id} className="border rounded-md p-2 text-sm">
                  <p className="font-medium">{c.razon_social}</p>
                  <p className="text-muted-foreground">Código: {c.codigo_cliente}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewRouteDialog
        open={showNewRouteDialog}
        onOpenChange={setShowNewRouteDialog}
        onRouteCreated={handleRouteCreated}
        vendedores={vendedores}
      />
    </div>
  );
};

export default RoutesList;
