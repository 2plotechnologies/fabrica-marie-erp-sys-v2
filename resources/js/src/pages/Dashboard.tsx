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
import { toast } from 'sonner';
import { formatErrorMessage } from '@/lib/axios-error';

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
      console.log("ERROR COMPLETO:", error);
      console.log("RESPUESTA DEL SERVIDOR:", error.response?.data);
      toast.error(formatErrorMessage('Error al obtener el dashboard', error, 'No se pudo cargar el dashboard.'));
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
              trend={kpis?.ventas?.trend_hoy ? {
                value: kpis.ventas.trend_hoy.value,
                isPositive: kpis.ventas.trend_hoy.isPositive,
                label: 'vs ayer'
              } : undefined}
              delay={0}
            />
            <KPICard
              title="Ventas del Mes"
              value={`S/ ${(Number(kpis.ventas.mes) / 1000).toFixed(1)}K`}
              subtitle={
                kpis?.ventas?.proyeccion_mes
                  ? `Meta: S/ ${Number(kpis.ventas.proyeccion_mes) >= 1000 ? `${Number((Number(kpis.ventas.proyeccion_mes) / 1000).toFixed(1))}K` : Number(kpis.ventas.proyeccion_mes).toLocaleString('es-PE')}`
                  : 'Meta: -'
              }
              icon={TrendingUp}
              trend={
                kpis?.ventas?.proyeccion_mes && kpis?.ventas?.trend_mes
                  ? {
                      value: kpis.ventas.trend_mes.value,
                      isPositive: kpis.ventas.trend_mes.isPositive,
                      label: 'de la meta',
                      showPlus: false,
                    }
                  : undefined
              }
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
              trend={kpis?.ventas?.trend_hoy ? {
                value: kpis.ventas.trend_hoy.value,
                isPositive: kpis.ventas.trend_hoy.isPositive,
                label: 'vs ayer'
              } : undefined}
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

      case 'VENDEDOR': {
        const tieneSalida = kpis?.tiene_salida_activa ?? false;
        const resumen = kpis?.resumen_dinero || {};
        const creditos = kpis?.creditos_pendientes || { total_saldo: 0, cuentas: [] };
        const stockRuta = kpis?.stock_en_ruta || [];

        if (!tieneSalida) {
          return (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-l-amber-500 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">No hay salida en ruta vigente</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Actualmente no posees una salida despachada en estado "EN RUTA". Tus KPIs y acumulados figurarán automáticamente cuando se active tu salida.
                </p>
              </div>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Ventas (Salida Vigente)"
              value={`S/ ${(Number(resumen.total_ventas ?? 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              subtitle={`Contado: S/ ${Number(resumen.ventas_contado || 0).toLocaleString()} | Crédito: S/ ${Number(resumen.ventas_credito || 0).toLocaleString()}`}
              icon={DollarSign}
              variant="primary"
              delay={0}
            />
            <KPICard
              title="Efectivo y Cobros (Salida)"
              value={`S/ ${Number(resumen.efectivo_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              subtitle={`Cobranzas: S/ ${Number(resumen.total_cobranzas || 0).toLocaleString()}`}
              icon={Wallet}
              variant="success"
              delay={50}
            />
            <KPICard
              title="Créditos Pend. Ruta"
              value={`S/ ${Number(creditos.total_saldo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              subtitle={`${creditos.cuentas?.length || 0} cuentas en rutas`}
              icon={Clock}
              variant="warning"
              delay={100}
            />
            <KPICard
              title="Productos en Vehículo"
              value={stockRuta.length}
              subtitle="Con stock disponible"
              icon={Package}
              variant="default"
              delay={150}
            />
          </div>
        );
      }

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

      case 'VENDEDOR': {
        const tieneSalida = kpis?.tiene_salida_activa ?? false;
        const salida = kpis?.salida_activa || null;
        const resumen = kpis?.resumen_dinero || {};
        const creditosPendientes = kpis?.creditos_pendientes?.cuentas || [];
        const stockEnRuta = kpis?.stock_en_ruta || [];

        if (!tieneSalida) {
          return (
            <div className="space-y-6 col-span-full">
              <Card className="shadow-card border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20">
                <CardContent className="p-8 text-center space-y-3">
                  <div className="h-14 w-14 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                    <Truck className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200">No hay salida en ruta vigente</h3>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    Actualmente no cuentas con una salida despachada en estado <strong>EN RUTA</strong>.
                    Los acumulados de dinero, ventas, cobranzas y stock disponible de tus productos se mostrarán automáticamente en este panel en cuanto tu salida sea despachada a ruta.
                  </p>
                </CardContent>
              </Card>

              {kpis?.tareas_hoy && kpis.tareas_hoy.length > 0 && (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Mis Tareas de Hoy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kpis.tareas_hoy.map((task: any) => (
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

              <QuickActions />
            </div>
          );
        }

        return (
          <div className="space-y-6 col-span-full">
            {/* Cabecera Informativa de la Salida Vigente */}
            {salida && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary text-primary-foreground rounded-lg">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base flex items-center gap-2">
                      Salida Vigente #{salida.id}
                      <Badge className="bg-emerald-600 text-white font-bold">EN RUTA</Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <strong>Vehículo:</strong> {salida.vehiculo} &nbsp;|&nbsp; <strong>Conductor:</strong> {salida.conductor || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Ruta(s):</strong> {salida.rutas}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Fecha Salida</p>
                  <p className="font-mono">{salida.fecha}</p>
                </div>
              </div>
            )}

            {/* TARJETA 1: Resumen de Ventas y Dinero Acumulado (Por Método de Pago Separados) */}
            <Card className="shadow-card animate-fade-in border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" />
                    Tarjeta 1: Ventas y Dinero Acumulado en Salida Vigente
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Acumulado total de la salida en ruta por método de pago
                  </p>
                </div>
                <Badge variant="outline" className="text-sm font-bold border-primary text-primary px-3 py-1">
                  Ventas Salida: S/ {Number(resumen.total_ventas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                  {/* EFECTIVO */}
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">💵 Efectivo</span>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      S/ {Number(resumen.efectivo_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2">
                      <div className="flex justify-between">
                        <span>Ventas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.efectivo_ventas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cobranzas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.efectivo_cobranzas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entregas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.efectivo_entregas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* YAPE */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">📱 Yape</span>
                    </div>
                    <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">
                      S/ {Number(resumen.yape_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5 border-t border-purple-200/60 dark:border-purple-800/60 pt-2">
                      <div className="flex justify-between">
                        <span>Ventas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.yape_ventas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cobranzas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.yape_cobranzas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entregas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.yape_entregas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* PLIN */}
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl border border-cyan-200 dark:border-cyan-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider">📱 Plin</span>
                    </div>
                    <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-400">
                      S/ {Number(resumen.plin_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5 border-t border-cyan-200/60 dark:border-cyan-800/60 pt-2">
                      <div className="flex justify-between">
                        <span>Ventas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.plin_ventas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cobranzas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.plin_cobranzas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entregas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.plin_entregas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* DEPOSITO / TRANSFERENCIA */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">🏦 Depósito / Trans.</span>
                    </div>
                    <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                      S/ {Number(resumen.deposito_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5 border-t border-blue-200/60 dark:border-blue-800/60 pt-2">
                      <div className="flex justify-between">
                        <span>Ventas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.deposito_ventas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cobranzas:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.deposito_cobranzas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entregas / Transf.:</span>
                        <span className="font-semibold text-foreground">S/ {Number(resumen.deposito_entregas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* CRÉDITOS Y COBRANZAS SUMMARY */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">💳 Créditos y Cobros</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Cobranzas:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">S/ {Number(resumen.total_cobranzas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Entregas:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">S/ {Number(resumen.total_entregas || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ventas Crédito:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">S/ {Number(resumen.ventas_credito || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Adelantos Créd.:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">S/ {Number(resumen.adelantos_credito || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TARJETA 2: Créditos Pendientes de Rutas Actuales (Del más antiguo al más reciente) */}
              <Card className="shadow-card animate-fade-in border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Tarjeta 2: Créditos Pendientes en Rutas Actuales
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ordenados del más antiguo al más reciente (por vencimiento)
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-3 py-1">
                    Total: S/ {Number(kpis?.creditos_pendientes?.total_saldo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {creditosPendientes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                      No hay créditos pendientes en las rutas actuales.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                          <tr>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Ruta / Venta</th>
                            <th className="p-2.5">Vencimiento</th>
                            <th className="p-2.5 text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {creditosPendientes.map((item: any) => {
                            const isPaid = (item.estado || '').toUpperCase() === 'PAGADO';
                            return (
                              <tr key={item.id} className={`hover:bg-muted/50 transition-colors ${isPaid ? 'opacity-60 bg-muted/20' : ''}`}>
                                <td className="p-2.5 font-medium">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold">{item.cliente_nombre || item.cliente?.razon_social}</span>
                                    {item.es_ruta_actual ? (
                                      <Badge variant="default" className="bg-emerald-600 text-[9px] py-0 px-1 h-3.5">Ruta Actual</Badge>
                                    ) : item.es_zona_actual ? (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 text-[9px] py-0 px-1 h-3.5">Zona Actual</Badge>
                                    ) : null}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono">{item.codigo_cliente || item.cliente?.codigo_cliente || '-'}</span>
                                </td>
                                <td className="p-2.5">
                                  <div className="text-xs font-bold text-primary">{item.ruta_nombre || 'Ruta'}</div>
                                  <div className="text-[11px] text-muted-foreground">{item.venta_codigo || (item.venta?.codigo ? item.venta.codigo : `Venta #${item.venta_id}`)}</div>
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {item.fecha_vencimiento ? (typeof item.fecha_vencimiento === 'string' ? item.fecha_vencimiento.substring(0, 10) : item.fecha_vencimiento) : '-'}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-right font-bold">
                                  {isPaid ? (
                                    <span className="text-emerald-600 text-xs font-semibold">PAGADO</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400">S/ {Number(item.saldo).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* TARJETA 3: Stock de Productos Asignados Disponibles en Ruta */}
              <Card className="shadow-card animate-fade-in border-l-4 border-l-emerald-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Package className="h-5 w-5 text-emerald-500" />
                      Tarjeta 3: Stock Disponible en Ruta
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Solo productos con stock disponible en el vehículo/salida actual
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1">
                    {stockEnRuta.length} Productos
                  </Badge>
                </CardHeader>
                <CardContent>
                  {stockEnRuta.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500 opacity-60" />
                      No hay productos con stock disponible en la ruta activa.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                          <tr>
                            <th className="p-2.5">Producto</th>
                            <th className="p-2.5 text-center">Asignado</th>
                            <th className="p-2.5 text-center">Vendido</th>
                            <th className="p-2.5 text-right">Disponible</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {stockEnRuta.map((prod: any) => (
                            <tr key={prod.id} className="hover:bg-muted/50 transition-colors">
                              <td className="p-2.5 font-medium">
                                <div className="font-semibold">{prod.producto_nombre}</div>
                                {prod.unidad_medida && (
                                  <span className="text-[10px] text-muted-foreground">({prod.unidad_medida})</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono text-xs">
                                {prod.stock_asignado ?? 0}
                              </td>
                              <td className="p-2.5 text-center font-mono text-xs text-muted-foreground">
                                {prod.vendido ?? 0}
                              </td>
                              <td className="p-2.5 text-right">
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-0.5">
                                  {prod.stock_disponible} und
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Mis Tareas de Hoy */}
            {kpis?.tareas_hoy && kpis.tareas_hoy.length > 0 && (
              <Card className="shadow-card animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Mis Tareas de Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {kpis.tareas_hoy.map((task: any) => (
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

            <QuickActions />
          </div>
        );
      }

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
                  {kpis.vehiculos.map((vehiculo) => {

                    const tieneMantenimientoPendiente =
                      vehiculo.fecha_programada &&
                      vehiculo.estado_mantenimiento !== 'COMPLETADO';

                    return (
                      <div
                        key={vehiculo.id}
                        className={`p-4 rounded-lg border ${vehiculo.estado === 'DISPONIBLE'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg">{vehiculo.placa}</p>
                            <p className="text-sm text-muted-foreground">
                              {vehiculo.marca} {vehiculo.modelo}
                            </p>
                          </div>

                          <Badge
                            variant={vehiculo.estado === 'DISPONIBLE' ? 'default' : 'secondary'}
                          >
                            {vehiculo.estado}
                          </Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Próx. Mant.</p>

                            {tieneMantenimientoPendiente ? (
                              <p className="font-medium text-amber-600">
                                {vehiculo.fecha_programada}
                              </p>
                            ) : (
                              <p className="font-medium text-emerald-600">
                                Sin Mant.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${mant.tipo === 'PREVENTIVO'
                                ? 'bg-red-500'
                                : mant.tipo === 'CORRECTIVO'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                          />

                          <div>
                            <p className="font-medium">{mant.tipo}</p>
                            <p className="text-xs text-muted-foreground">
                              {mant.placa}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={mant.tipo === 'PREVENTIVO' ? 'destructive' : 'outline'}
                        >
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
