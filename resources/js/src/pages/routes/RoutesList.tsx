/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  MapPin,
  Users,
  Truck,
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
import { mockRoutes, mockUsers } from '@/data/mockData';
import { cn } from '@/lib/utils';
import RouteMap from '@/components/routes/RouteMap';
import NewRouteDialog from '@/components/routes/NewRouteDialog';

const RoutesList = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [showNewRouteDialog, setShowNewRouteDialog] = useState(false);
  const [routes, setRoutes] = useState(mockRoutes);

  const getAssignedSeller = (sellerId?: string) => {
    return mockUsers.find(u => u.id === sellerId);
  };

  const handleRouteCreated = (newRoute: any) => {
    setRoutes(prev => [...prev, newRoute]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Tabs */}
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
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Rutas Activas</p>
              <p className="text-2xl font-bold">
                {routes.filter(r => r.status === 'ACTIVA').length}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold">
                {routes.reduce((sum, r) => sum + r.clientCount, 0)}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Vendedores Asignados</p>
              <p className="text-2xl font-bold">
                {routes.filter(r => r.assignedSellerId).length}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Cobertura Promedio</p>
              <p className="text-2xl font-bold text-success">87%</p>
            </div>
          </div>

          {/* Routes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route, index) => {
              const seller = getAssignedSeller(route.assignedSellerId);
              const coverage = 75 + Math.random() * 20;

              return (
                <div
                  key={route.id}
                  className="bg-card rounded-xl border shadow-card p-5 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                  style={{ animationDelay: `${200 + index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        route.zone === 'Norte' && 'bg-info/10',
                        route.zone === 'Sur' && 'bg-success/10',
                        route.zone === 'Centro' && 'bg-warning/10'
                      )}>
                        <MapPin className={cn(
                          "h-6 w-6",
                          route.zone === 'Norte' && 'text-info',
                          route.zone === 'Sur' && 'text-success',
                          route.zone === 'Centro' && 'text-warning'
                        )} />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold">{route.name}</h3>
                        <p className="text-sm text-muted-foreground">Zona {route.zone}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                        <DropdownMenuItem>Editar ruta</DropdownMenuItem>
                        <DropdownMenuItem>Reasignar vendedor</DropdownMenuItem>
                        <DropdownMenuItem>Ver clientes</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    {/* Assigned Seller */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {seller ? (
                          <span className="text-xs font-medium text-primary">
                            {seller.firstName[0]}{seller.lastName[0]}
                          </span>
                        ) : (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {seller ? (
                          <>
                            <p className="text-sm font-medium truncate">
                              {seller.firstName} {seller.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">Vendedor</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin asignar</p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold">{route.clientCount}</p>
                        <p className="text-xs text-muted-foreground">Clientes</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-secondary/30">
                        <p className="text-lg font-bold">{Math.round(coverage)}%</p>
                        <p className="text-xs text-muted-foreground">Cobertura</p>
                      </div>
                    </div>

                    {/* Coverage Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Cumplimiento hoy</span>
                        <span className={cn(
                          "font-medium",
                          coverage >= 80 ? 'text-success' : coverage >= 60 ? 'text-warning' : 'text-destructive'
                        )}>
                          {Math.round(coverage)}%
                        </span>
                      </div>
                      <Progress
                        value={coverage}
                        className={cn(
                          "h-2",
                          coverage >= 80 && '[&>div]:bg-success',
                          coverage >= 60 && coverage < 80 && '[&>div]:bg-warning',
                          coverage < 60 && '[&>div]:bg-destructive'
                        )}
                      />
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge
                        variant="outline"
                        className={cn(
                          route.status === 'ACTIVA'
                            ? 'border-success/30 text-success bg-success/10'
                            : 'border-muted text-muted-foreground'
                        )}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {route.status}
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
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <RouteMap routes={routes} onRoutesChange={setRoutes} />
        </TabsContent>
      </Tabs>

      {/* New Route Dialog */}
      <NewRouteDialog
        open={showNewRouteDialog}
        onOpenChange={setShowNewRouteDialog}
        onRouteCreated={handleRouteCreated}
      />
    </div>
  );
};

export default RoutesList;
