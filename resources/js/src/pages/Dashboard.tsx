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

const Dashboard = () => {
  const { currentRole, roleLabels } = useRole();
  const { user } = useAuth();
  const userDisplayName = user?.nombre || user?.username || 'Usuario';
  const kpis = mockDashboardKPIs;
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
              value={`S/ ${kpis.sales.today.toLocaleString('es-PE')}`}
              subtitle={`${kpis.sales.todayCount} transacciones`}
              icon={DollarSign}
              variant="primary"
              trend={{ value: 12.5, isPositive: true }}
              delay={0}
            />
            <KPICard
              title="Ventas del Mes"
              value={`S/ ${(kpis.sales.month / 1000).toFixed(1)}K`}
              subtitle="Meta: S/ 150K"
              icon={TrendingUp}
              trend={{ value: 8.2, isPositive: true }}
              delay={50}
            />
            <KPICard
              title="Cobros Hoy"
              value={`S/ ${kpis.collections.today.toLocaleString('es-PE')}`}
              subtitle="En efectivo"
              icon={ShoppingCart}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Por Cobrar"
              value={`S/ ${(kpis.collections.pending / 1000).toFixed(1)}K`}
              subtitle={`S/ ${kpis.collections.overdue.toLocaleString()} vencido`}
              icon={Users}
              variant="warning"
              delay={150}
            />
            <KPICard
              title="Stock Bajo"
              value={kpis.stock.lowStockCount}
              subtitle={`de ${kpis.stock.totalProducts} productos`}
              icon={Package}
              variant={kpis.stock.lowStockCount > 0 ? 'danger' : 'default'}
              delay={200}
            />
            <KPICard
              title="Rutas Hoy"
              value={`${kpis.routes.efficiency}%`}
              subtitle={`${kpis.routes.visitedClients} clientes visitados`}
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
              value={`S/ ${kpis.sales.today.toLocaleString('es-PE')}`}
              subtitle={`${kpis.sales.todayCount} ventas hoy`}
              icon={TrendingUp}
              variant="primary"
              trend={{ value: 12.5, isPositive: true }}
              delay={0}
            />
            <KPICard
              title="Rutas Activas"
              value={kpis.routes.completedToday}
              subtitle={`${kpis.routes.visitedClients} clientes visitados`}
              icon={MapPin}
              delay={50}
            />
            <KPICard
              title="Eficiencia"
              value={`${kpis.routes.efficiency}%`}
              subtitle="Promedio del equipo"
              icon={BarChart3}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Clientes Pendientes"
              value={kpis.clients.total - kpis.routes.visitedClients}
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
              value={`S/ ${(kpis.sales.today * 0.3).toLocaleString('es-PE')}`}
              subtitle="Meta diaria: S/ 2,000"
              icon={DollarSign}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Clientes Visitados"
              value={todayRoute.visited}
              subtitle={`de ${todayRoute.totalClients} programados`}
              icon={Users}
              delay={50}
            />
            <KPICard
              title="Cobros del Día"
              value={`S/ ${(kpis.collections.today * 0.25).toLocaleString('es-PE')}`}
              subtitle="En efectivo"
              icon={Wallet}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Mi Ruta"
              value={`${todayRoute.progress}%`}
              subtitle={`${todayRoute.pending} pendientes`}
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
              value={kpis.stock.totalProducts}
              subtitle="En inventario"
              icon={Package}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Stock Bajo"
              value={kpis.stock.lowStockCount}
              subtitle="Requieren reposición"
              icon={AlertTriangle}
              variant={kpis.stock.lowStockCount > 0 ? 'danger' : 'success'}
              delay={50}
            />
            <KPICard
              title="Valor Inventario"
              value={`S/ ${(kpis.stock.totalValue / 1000).toFixed(1)}K`}
              subtitle="Total valorizado"
              icon={DollarSign}
              delay={100}
            />
            <KPICard
              title="Movimientos Hoy"
              value={8}
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
              value={`S/ ${kpis.collections.today.toLocaleString('es-PE')}`}
              subtitle="Total recibido"
              icon={DollarSign}
              variant="success"
              delay={0}
            />
            <KPICard
              title="Ventas Contado"
              value={`S/ ${(kpis.sales.today * 0.4).toLocaleString('es-PE')}`}
              subtitle={`${Math.floor(kpis.sales.todayCount * 0.4)} transacciones`}
              icon={ShoppingCart}
              variant="primary"
              delay={50}
            />
            <KPICard
              title="Cobros Crédito"
              value={`S/ ${(kpis.collections.today * 0.6).toLocaleString('es-PE')}`}
              subtitle="Pagos recibidos"
              icon={Wallet}
              delay={100}
            />
            <KPICard
              title="Estado Caja"
              value="Abierta"
              subtitle="Desde 8:00 AM"
              icon={CheckCircle}
              variant="success"
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
              value={6}
              subtitle="De 8 en flota"
              icon={Truck}
              variant="success"
              delay={0}
            />
            <KPICard
              title="En Mantenimiento"
              value={2}
              subtitle="Reparación activa"
              icon={AlertTriangle}
              variant="warning"
              delay={50}
            />
            <KPICard
              title="Rutas Activas"
              value={kpis.routes.completedToday}
              subtitle="Hoy en circulación"
              icon={MapPin}
              variant="primary"
              delay={100}
            />
            <KPICard
              title="Próx. Mantenimiento"
              value="3 días"
              subtitle="ABC-123 - Cambio aceite"
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
            <RecentSalesTable sales={mockSales} />
            <div className="space-y-6">
              <QuickActions />
              <StockAlerts lowStockItems={lowStockItems} />
              <ClientsOverview clients={mockClients} />
            </div>
          </>
        );

      case 'SUPERVISOR':
        return (
          <>
            <RecentSalesTable sales={mockSales} />
            <div className="space-y-6">
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
              <StockAlerts lowStockItems={lowStockItems} />
            </div>
          </>
        );

      case 'VENDEDOR':
        return (
          <>
            <Card className="shadow-card animate-fade-in lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Mis Tareas de Hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{task.task}</p>
                        <p className="text-xs text-muted-foreground">{task.client}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{task.time}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Mi Ruta: {todayRoute.name}
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
              <QuickActions />
            </div>
          </>
        );

      case 'ALMACENERO':
        return (
          <>
            <StockAlerts lowStockItems={lowStockItems} />
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
                  {[
                    { tipo: 'ENTRADA', producto: 'Galletas Premium', qty: 100, hora: '09:30' },
                    { tipo: 'SALIDA', producto: 'Galletas Chocolate', qty: 50, hora: '10:15' },
                    { tipo: 'SALIDA', producto: 'Galletas Integrales', qty: 30, hora: '11:00' },
                  ].map((mov, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={mov.tipo === 'ENTRADA' ? 'default' : 'secondary'}>
                          {mov.tipo}
                        </Badge>
                        <span className="font-medium">{mov.producto}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{mov.qty} und</p>
                        <p className="text-xs text-muted-foreground">{mov.hora}</p>
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
            <RecentSalesTable sales={mockSales.filter(s => s.paymentType === 'CONTADO')} />
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
                    <span className="font-bold text-emerald-600">S/ {kpis.collections.today.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span>Egresos</span>
                    <span className="font-bold text-red-600">S/ 350.00</span>
                  </div>
                  <div className="flex justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                    <span className="font-medium">Saldo Actual</span>
                    <span className="font-bold text-primary">S/ {(kpis.collections.today - 350).toLocaleString()}</span>
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
                  {[
                    { placa: 'ABC-123', tipo: 'Camión', estado: 'Operativo', km: 45230, proxMant: '15 días' },
                    { placa: 'DEF-456', tipo: 'Furgón', estado: 'En Mantenimiento', km: 62100, proxMant: 'Hoy' },
                    { placa: 'GHI-789', tipo: 'Camioneta', estado: 'Operativo', km: 28500, proxMant: '30 días' },
                    { placa: 'JKL-012', tipo: 'Camión', estado: 'Operativo', km: 51800, proxMant: '7 días' },
                  ].map((vehiculo) => (
                    <div key={vehiculo.placa} className={`p-4 rounded-lg border ${vehiculo.estado === 'Operativo' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg">{vehiculo.placa}</p>
                          <p className="text-sm text-muted-foreground">{vehiculo.tipo}</p>
                        </div>
                        <Badge variant={vehiculo.estado === 'Operativo' ? 'default' : 'secondary'}>
                          {vehiculo.estado}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Kilometraje</p>
                          <p className="font-medium">{vehiculo.km.toLocaleString()} km</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Próx. Mant.</p>
                          <p className={`font-medium ${vehiculo.proxMant === 'Hoy' ? 'text-amber-600' : ''}`}>{vehiculo.proxMant}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Mantenimientos Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { vehiculo: 'DEF-456', tipo: 'Cambio de aceite', prioridad: 'Alta', fecha: 'Hoy' },
                    { vehiculo: 'JKL-012', tipo: 'Revisión frenos', prioridad: 'Media', fecha: 'En 7 días' },
                    { vehiculo: 'ABC-123', tipo: 'Cambio llantas', prioridad: 'Baja', fecha: 'En 15 días' },
                  ].map((mant, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${mant.prioridad === 'Alta' ? 'bg-red-500' : mant.prioridad === 'Media' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <div>
                          <p className="font-medium">{mant.tipo}</p>
                          <p className="text-xs text-muted-foreground">{mant.vehiculo}</p>
                        </div>
                      </div>
                      <Badge variant={mant.prioridad === 'Alta' ? 'destructive' : 'outline'}>
                        {mant.fecha}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
            </div>
          </>
        );

      default:
        return null;
    }
  };

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
