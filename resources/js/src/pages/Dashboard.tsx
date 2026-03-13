import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  MapPin,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { RecentSalesTable } from '@/components/dashboard/RecentSalesTable';
import { StockAlerts } from '@/components/dashboard/StockAlerts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ClientsOverview } from '@/components/dashboard/ClientsOverview';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  mockDashboardKPIs,
  mockSales,
  mockStock,
  mockClients
} from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { dashboardService } from '@/services/dashboardService';

const Dashboard = () => {
  const { currentRole, roleLabels } = useRole();
  const { user } = useAuth();
  const userDisplayName = user?.nombre || user?.username || 'Usuario';
  const [kpis, setKpis] = useState<any>(null);
  const lowStockItems = mockStock.filter(s => s.quantity < s.minStock);

  // Datos mock para widgets específicos por rol
  const pendingTasks = [
    { id: 1, task: 'Entregar pedido #1234', client: 'Bodega Don Pedro', time: '10:30 AM' },
    { id: 2, task: 'Cobrar factura #567', client: 'Minimarket El Sol', time: '11:00 AM' },
    { id: 3, task: 'Visitar nuevo cliente', client: 'Tienda Nueva', time: '02:00 PM' },
  ];

  const todayRoute = {
    name: 'Ruta Norte',
    totalClients: 12,
    visited: 5,
    pending: 7,
    progress: 42,
  };

  const getDashboardAGS = async () => {
    try {
      const response = await dashboardService.getDashboardAGS();
      console.log(response);
      setKpis(response.data);
    } catch (error) {
      console.error('Error al obtener el dashboard:', error);
    }
  };

  const getDashboardVendedor = async () => {
    try {
      const response = await dashboardService.getDashboardVendedor();
      console.log(response);
      setKpis(response.data);
    } catch (error) {
      console.error('Error al obtener el dashboard:', error);
    }
  };

  const getDashboardAlmacenero = async () => {
    try {
      const response = await dashboardService.getDashboardAlmacenero();
      console.log(response);
      setKpis(response.data);
    } catch (error) {
      console.error('Error al obtener el dashboard:', error);
    }
  };

  const getDashboardCajero = async () => {
    try {
      const response = await dashboardService.getDashboardCajero();
      console.log(response);
      setKpis(response.data);
    } catch (error) {
      console.error('Error al obtener el dashboard:', error);
    }
  };

  const getDashboardMantenimiento = async () => {
    try {
      const response = await dashboardService.getDashboardMantenimiento();
      console.log(response);
      setKpis(response.data);
    } catch (error) {
      console.error('Error al obtener el dashboard:', error);
    }
  };

  useEffect(() => {
    //Enviar peticion de acuerdo al rol con switch
    switch (currentRole) {
      case 'ADMIN':
      case 'GERENTE':
      case 'SUPERVISOR':
        getDashboardAGS();
        break;
      case 'VENDEDOR':
        getDashboardVendedor();
        break;
      case 'ALMACENERO':
        getDashboardAlmacenero();
        break;
      case 'CAJERO':
        getDashboardCajero();
        break;
      case 'MANTENIMIENTO':
        getDashboardMantenimiento();
        break;
      default:
        break;
    }
  }, []);

  // Configuración de KPIs por rol
  const getRoleKPIs = () => {
    switch (currentRole) {
      case 'ADMIN':
      case 'GERENTE':
        // Vista completa con todos los KPIs financieros y operativos
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              title="Ventas Hoy"
              value={`S/ ${Number(kpis.ventas.hoy).toLocaleString('es-PE')}`}
              subtitle={`${kpis.ventas.total_hoy} transacciones`}
              icon={DollarSign}
              variant="primary"
              trend={{ value: 12.5, isPositive: true }}
              delay={0}
            />
            <KPICard
              title="Ventas del Mes"
              value={`S/ ${(Number(kpis.ventas.mes) / 1000).toFixed(1)}K`}
              subtitle="Meta: S/ 150K"
              icon={TrendingUp}
              trend={{ value: 8.2, isPositive: true }}
              delay={50}
            />
            <KPICard
              title="Cobros Hoy"
              value={`S/ ${Number(kpis.cobros.hoy).toLocaleString('es-PE')}`}
              subtitle="En efectivo"
              icon={ShoppingCart}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Por Cobrar"
              value={`S/ ${(Number(kpis.cobros.pendientes) / 1000).toFixed(1)}K`}
              subtitle={`S/ ${Number(kpis.cobros.vencido).toLocaleString()} vencido`}
              icon={Users}
              variant="warning"
              delay={150}
            />
            <KPICard
              title="Stock Bajo"
              value={kpis.stock.cuenta_stock_bajo}
              subtitle={`de ${kpis.stock.total_productos} productos`}
              icon={Package}
              variant={Number(kpis.stock.cuenta_stock_bajo) > 0 ? 'danger' : 'default'}
              delay={200}
            />
            <KPICard
              title="Rutas Hoy"
              value={`${kpis.rutas.eficiencia}%`}
              subtitle={`${kpis.rutas.clientes_visitados} clientes visitados`}
              icon={MapPin}
              delay={250}
            />
          </div>
        );

      case 'SUPERVISOR':
        // Vista de supervisión: rendimiento de vendedores y rutas
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Ventas del Equipo"
              value={`S/ ${Number(kpis.ventas.hoy).toLocaleString('es-PE')}`}
              subtitle={`${kpis.ventas.total_hoy} ventas hoy`}
              icon={TrendingUp}
              variant="primary"
              trend={{ value: 12.5, isPositive: true }}
              delay={0}
            />
            <KPICard
              title="Rutas Activas"
              value={kpis.rutas.total_rutas ? kpis.rutas.total_rutas : 0}
              subtitle={`${kpis.rutas.clientes_visitados} clientes visitados`}
              icon={MapPin}
              delay={50}
            />
            <KPICard
              title="Eficiencia"
              value={`${kpis.rutas.eficiencia}%`}
              subtitle="Promedio del equipo"
              icon={BarChart3}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Clientes Pendientes"
              value={Number(kpis.clientes.total) - Number(kpis.rutas.clientes_visitados)}
              subtitle="Por visitar hoy"
              icon={Users}
              variant="warning"
              delay={150}
            />
          </div>
        );

      case 'VENDEDOR':
        // Vista de vendedor: sus ventas, su ruta, sus clientes
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Mis Ventas Hoy"
              value={`S/ ${(Number(kpis.ventas_hoy) * 0.3).toLocaleString('es-PE')}`}
              subtitle="Meta diaria: S/ 2,000"
              icon={DollarSign}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Clientes Visitados"
              value={kpis.clientes_visitados ? kpis.clientes_visitados : 0}
              subtitle={`de ${kpis.total_clientes.total} programados`}
              icon={Users}
              delay={50}
            />
            <KPICard
              title="Cobros del Día"
              value={`S/ ${(Number(kpis.cobros_hoy) * 0.25).toLocaleString('es-PE')}`}
              subtitle="En efectivo"
              icon={Wallet}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Mi Ruta"
              value={`${kpis.rutas_hoy}%`}
              subtitle={`${kpis.total_clientes.total - kpis.clientes_visitados} pendientes`}
              icon={MapPin}
              delay={150}
            />
          </div>
        );

      case 'ALMACENERO':
        // Vista de almacén: stock, movimientos, alertas
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Productos Totales"
              value={kpis.total_productos}
              subtitle="En inventario"
              icon={Package}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Stock Bajo"
              value={kpis.total_stock_bajo}
              subtitle="Requieren reposición"
              icon={AlertTriangle}
              variant={kpis.total_stock_bajo > 0 ? 'danger' : 'success'}
              delay={50}
            />
            <KPICard
              title="Valor Inventario"
              value={`S/ ${(Number(kpis.valor_inventario) / 1000).toFixed(1)}K`}
              subtitle="Total valorizado"
              icon={DollarSign}
              delay={100}
            />
            <KPICard
              title="Movimientos Hoy"
              value={kpis.total_movimientos_hoy}
              subtitle="Entradas y salidas"
              icon={Truck}
              delay={150}
            />
          </div>
        );

      case 'CAJERO':
        // Vista de caja: ingresos, egresos, cierres
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Ingresos Hoy"
              value={`S/ ${Number(kpis.total_ingresos_hoy).toLocaleString('es-PE')}`}
              subtitle="Total recibido"
              icon={DollarSign}
              variant="success"
              delay={0}
            />
            <KPICard
              title="Ventas Contado"
              value={`S/ ${Number(kpis.total_ventas_contado_hoy).toLocaleString('es-PE')}`}
              subtitle={`${Math.floor(kpis.total_ventas_contado_hoy * 0.4)} transacciones`}
              icon={ShoppingCart}
              variant="primary"
              delay={50}
            />
            <KPICard
              title="Cobros Crédito"
              value={`S/ ${Number(kpis.total_cobros_hoy).toLocaleString('es-PE')}`}
              subtitle="Pagos recibidos"
              icon={Wallet}
              delay={100}
            />
            <KPICard
              title="Estado Caja"
              value={kpis.estado_caja}
              subtitle="Hoy"
              icon={CheckCircle}
              variant={kpis.estado_caja === 'ABIERTA' ? 'success' : 'danger'}
              delay={150}
            />
          </div>
        );

      case 'RRHH':
        // Vista de RRHH: empleados, asistencia, bonos
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Empleados Activos"
              value={15}
              subtitle="Total en planilla"
              icon={Users}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Asistencia Hoy"
              value="93%"
              subtitle="14 de 15 presentes"
              icon={CheckCircle}
              variant="success"
              delay={50}
            />
            <KPICard
              title="Planilla del Mes"
              value="S/ 45.2K"
              subtitle="Incluye bonos"
              icon={Wallet}
              delay={100}
            />
            <KPICard
              title="Bonos Pendientes"
              value={3}
              subtitle="Por aprobar"
              icon={Clock}
              variant="warning"
              delay={150}
            />
          </div>
        );

      case 'FIDELIZACION':
        // Vista de Fidelización: puntos, canjes, clientes
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Clientes Activos"
              value={kpis.clients.total}
              subtitle="Con puntos acumulados"
              icon={Users}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Puntos del Mes"
              value="12.5K"
              subtitle="Puntos otorgados"
              icon={TrendingUp}
              variant="success"
              delay={50}
            />
            <KPICard
              title="Canjes Hoy"
              value={8}
              subtitle="Premios canjeados"
              icon={ShoppingCart}
              delay={100}
            />
            <KPICard
              title="Clientes Premium"
              value={23}
              subtitle="Nivel Oro/Platino"
              icon={CheckCircle}
              variant="warning"
              delay={150}
            />
          </div>
        );

      case 'MANTENIMIENTO':
        // Vista de Mantenimiento: vehículos, rutas, mantenimientos
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Vehículos Operativos"
              value={kpis.total_vehiculos}
              subtitle="En flota"
              icon={Truck}
              variant="success"
              delay={0}
            />
            <KPICard
              title="En Mantenimiento"
              value={kpis.total_vehiculos_mantenimiento}
              subtitle="En reparación"
              icon={AlertTriangle}
              variant="warning"
              delay={50}
            />
            <KPICard
              title="Rutas Activas"
              value={kpis.rutas_activas}
              subtitle="Hoy en circulación"
              icon={MapPin}
              variant="primary"
              delay={100}
            />
            <KPICard
              title="Próx. Mantenimiento"
              value={kpis.mantenimiento_mas_proximo?.fecha || 'N/A'}
              subtitle={kpis.mantenimiento_mas_proximo?.vehiculo?.placa || 'N/A'}
              icon={Clock}
              delay={150}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Widgets específicos por rol
  const getRoleWidgets = () => {
    switch (currentRole) {
      case 'ADMIN':
      case 'GERENTE':
        return (
          <>
            <RecentSalesTable sales={kpis.ultimas_ventas} />
            <div className="space-y-6">
              <QuickActions />
              <StockAlerts lowStockItems={kpis.stock_bajo} />
              <ClientsOverview clients={kpis.clientes_totales} />
            </div>
          </>
        );

      case 'SUPERVISOR':
        return (
          <>

            {kpis.ultimas_ventas.length > 0 && <RecentSalesTable sales={kpis.ultimas_ventas} />}
            <div className="space-y-6">
              {/*
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Rendimiento Vendedores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Juan Pérez', ventas: 1850, meta: 2000, visitas: 8 },
                    { name: 'Ana García', ventas: 2100, meta: 2000, visitas: 10 },
                    { name: 'Carlos Ruiz', ventas: 1400, meta: 2000, visitas: 6 },
                  ].map((vendedor) => (
                    <div key={vendedor.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{vendedor.name}</p>
                        <p className="text-xs text-muted-foreground">{vendedor.visitas} visitas hoy</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">S/ {vendedor.ventas.toLocaleString()}</p>
                        <Badge variant={vendedor.ventas >= vendedor.meta ? 'default' : 'secondary'}>
                          {Math.round((vendedor.ventas / vendedor.meta) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              */}
              {kpis.stock_bajo.length > 0 && <StockAlerts lowStockItems={kpis.stock_bajo} />}
            </div>
          </>
        );

      case 'VENDEDOR':
        return (
          <>
            {kpis.tareas_hoy.length > 0 && (
              <Card className="shadow-card animate-fade-in lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Mis Tareas de Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {kpis.tareas_hoy.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="font-medium">{task.titulo}</p>
                          <p className="text-xs text-muted-foreground">{task.descripcion}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{task.fecha_limite}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <div className="space-y-6">
              {/*
            <Card className="shadow-card animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                    Mi Ruta: {kpis.rutas_hoy.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-bold">{todayRoute.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                        style={{ width: `${todayRoute.progress}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">{todayRoute.visited}</p>
                        <p className="text-xs text-muted-foreground">Visitados</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{todayRoute.pending}</p>
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              */}
              <QuickActions />
            </div>
          </>
        );

      case 'ALMACENERO':
        return (
          <>
            <StockAlerts lowStockItems={kpis.stock_bajo} />
            <div className="space-y-6">
              <QuickActions />
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Últimos Movimientos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {kpis.ultimos_movimientos.map((mov, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={mov.tipo === 'ENTRADA' ? 'default' : 'secondary'}>
                          {mov.tipo}
                        </Badge>
                        <span className="font-medium">{mov.nombre}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{mov.cantidad} und</p>
                        <p className="text-xs text-muted-foreground">{mov.created_at}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        );

      case 'CAJERO':
        return (
          <>
            {kpis.ventas_mas_reciente && (
              <RecentSalesTable sales={kpis.ventas_mas_reciente} />
            )}
            <div className="space-y-6">
              <QuickActions />
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Resumen de Caja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <span>Ingresos</span>
                    <span className="font-bold text-emerald-600">S/ {Number(kpis.resumen_caja.ingresos).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span>Egresos</span>
                    <span className="font-bold text-red-600">S/ {Number(kpis.resumen_caja.egresos).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                    <span className="font-medium">Saldo Actual</span>
                    <span className="font-bold text-primary">S/ {Number(kpis.resumen_caja.saldo).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );

      case 'RRHH':
        return (
          <>
            <Card className="shadow-card animate-fade-in lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Asistencia del Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { nombre: 'Juan Pérez', rol: 'Vendedor', estado: 'Presente', hora: '07:55' },
                    { nombre: 'Ana García', rol: 'Vendedor', estado: 'Presente', hora: '08:02' },
                    { nombre: 'Carlos Ruiz', rol: 'Almacenero', estado: 'Presente', hora: '07:45' },
                    { nombre: 'María López', rol: 'Cajera', estado: 'Ausente', hora: '-' },
                  ].map((emp) => (
                    <div key={emp.nombre} className={`p-3 rounded-lg ${emp.estado === 'Presente' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <p className="font-medium text-sm">{emp.nombre}</p>
                      <p className="text-xs text-muted-foreground">{emp.rol}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={emp.estado === 'Presente' ? 'default' : 'destructive'} className="text-xs">
                          {emp.estado}
                        </Badge>
                        <span className="text-xs font-mono">{emp.hora}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <QuickActions />
            </div>
          </>
        );

      case 'FIDELIZACION':
        return (
          <>
            <Card className="shadow-card animate-fade-in lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Clientes con Puntos Activos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { nombre: 'Bodega Don Pedro', puntos: 1250, nivel: 'Oro', ultimaCompra: 'Hoy' },
                  { nombre: 'Minimarket El Sol', puntos: 890, nivel: 'Plata', ultimaCompra: 'Ayer' },
                  { nombre: 'Tienda María', puntos: 450, nivel: 'Bronce', ultimaCompra: 'Hace 3 días' },
                  { nombre: 'Abarrotes Central', puntos: 2100, nivel: 'Platino', ultimaCompra: 'Hoy' },
                ].map((cliente) => (
                  <div key={cliente.nombre} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{cliente.nombre}</p>
                      <p className="text-xs text-muted-foreground">Última compra: {cliente.ultimaCompra}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{cliente.puntos.toLocaleString()} pts</p>
                      <Badge variant={cliente.nivel === 'Platino' ? 'default' : 'secondary'}>
                        {cliente.nivel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-6">
              <QuickActions />
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Canjes del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { producto: 'Taza Corporativa', puntos: 500, canjes: 12 },
                    { producto: 'Polo Promocional', puntos: 1000, canjes: 5 },
                    { producto: 'Descuento 10%', puntos: 200, canjes: 28 },
                  ].map((canje, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{canje.producto}</p>
                        <p className="text-xs text-muted-foreground">{canje.puntos} pts requeridos</p>
                      </div>
                      <Badge variant="outline">{canje.canjes} canjes</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        );

      case 'MANTENIMIENTO':
        return (
          <>
            <Card className="shadow-card animate-fade-in lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Estado de Vehículos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kpis.vehiculos.map((vehiculo) => (
                    <div key={vehiculo.placa} className={`p-4 rounded-lg border ${vehiculo.estado === 'DISPONIBLE' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg">{vehiculo.placa}</p>
                          <p className="text-sm text-muted-foreground">{vehiculo.marca}</p>
                        </div>
                        <Badge variant={vehiculo.estado === 'DISPONIBLE' ? 'default' : 'secondary'}>
                          {vehiculo.estado}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Próx. Mant.</p>
                          <p className={`font-medium ${vehiculo.fecha_programada ? 'text-amber-600' : 'text-emerald-600'}`}>{vehiculo.fecha_programada ? vehiculo.fecha_programada : 'Sin Mant.'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {kpis.mantenimientos_mas_proximos.length > 0 && (
              <div className="space-y-6">
                <Card className="shadow-card animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Mantenimientos Pendientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kpis.mantenimientos_mas_proximos.map((mant, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${mant.tipo === 'PREVENTIVO' ? 'bg-red-500' : mant.tipo === 'CORRECTIVO' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <div>
                            <p className="font-medium">{mant.tipo}</p>
                            <p className="text-xs text-muted-foreground">{mant.placa}</p>
                          </div>
                        </div>
                        <Badge variant={mant.tipo === 'PREVENTIVO' ? 'destructive' : 'outline'}>
                          {mant.fecha_programada}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                {/*
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Rutas Activas Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { ruta: 'Ruta Norte', vehiculo: 'ABC-123', conductor: 'Juan Pérez', estado: 'En curso' },
                    { ruta: 'Ruta Sur', vehiculo: 'GHI-789', conductor: 'Carlos Ruiz', estado: 'En curso' },
                    { ruta: 'Ruta Centro', vehiculo: 'JKL-012', conductor: 'Pedro Sánchez', estado: 'Completada' },
                  ].map((ruta, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{ruta.ruta}</p>
                        <p className="text-xs text-muted-foreground">{ruta.vehiculo} - {ruta.conductor}</p>
                      </div>
                      <Badge variant={ruta.estado === 'Completada' ? 'default' : 'secondary'}>
                        {ruta.estado}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              */}
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  if (!kpis) {
    return <div>Cargando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">
          Buenos días, {userDisplayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Vista de {roleLabels[currentRole]} - Aquí está tu resumen del día
        </p>
      </div>

      {/* KPI Cards por Rol */}
      {getRoleKPIs()}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {getRoleWidgets()}
      </div>
    </div>
  );
};

export default Dashboard;
