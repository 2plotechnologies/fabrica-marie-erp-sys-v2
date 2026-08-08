import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Calendar,
  Download,
  ArrowUp,
  ArrowDown,
  Truck,
  Package,
  Target,
  DollarSign,
  Clock,
  MapPin,
  Award,
  Zap,
} from 'lucide-react';
import { mockSales, mockClients, mockProducts, mockDashboardKPIs } from '@/data/mockData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

const SalesReports = () => {
  // Sample data for charts
  const weeklyData = [
    { day: 'Lun', ventas: 4500, meta: 4000, cantidad: 85 },
    { day: 'Mar', ventas: 5200, meta: 4000, cantidad: 102 },
    { day: 'Mie', ventas: 3800, meta: 4000, cantidad: 71 },
    { day: 'Jue', ventas: 6100, meta: 4000, cantidad: 118 },
    { day: 'Vie', ventas: 7200, meta: 4000, cantidad: 142 },
    { day: 'Sab', ventas: 5800, meta: 4000, cantidad: 110 },
    { day: 'Dom', ventas: 2400, meta: 4000, cantidad: 45 },
  ];

  const monthlyData = [
    { month: 'Ene', ventas: 85000, proyeccion: 80000 },
    { month: 'Feb', ventas: 92000, proyeccion: 88000 },
    { month: 'Mar', ventas: 78000, proyeccion: 85000 },
    { month: 'Abr', ventas: 105000, proyeccion: 100000 },
    { month: 'May', ventas: 110000, proyeccion: 105000 },
    { month: 'Jun', ventas: 125680, proyeccion: 120000 },
    { month: 'Jul', ventas: null, proyeccion: 130000 },
    { month: 'Ago', ventas: null, proyeccion: 135000 },
  ];

  const categoryData = [
    { name: 'Premium', value: 45, color: 'hsl(var(--primary))' },
    { name: 'Clásico', value: 30, color: 'hsl(var(--cookie-400))' },
    { name: 'Saludable', value: 25, color: 'hsl(var(--cookie-600))' },
  ];

  // Ventas por vehículo vendedor
  const vehicleSalesData = [
    { vehiculo: 'ABC-123', vendedor: 'Juan Pérez', ventas: 28500, cantidadVentas: 45, zona: 'Norte', eficiencia: 92 },
    { vehiculo: 'DEF-456', vendedor: 'María García', ventas: 32100, cantidadVentas: 52, zona: 'Sur', eficiencia: 88 },
    { vehiculo: 'GHI-789', vendedor: 'Carlos López', ventas: 24300, cantidadVentas: 38, zona: 'Este', eficiencia: 85 },
    { vehiculo: 'JKL-012', vendedor: 'Ana Martínez', ventas: 29800, cantidadVentas: 48, zona: 'Oeste', eficiencia: 90 },
    { vehiculo: 'MNO-345', vendedor: 'Pedro Sánchez', ventas: 21500, cantidadVentas: 35, zona: 'Centro', eficiencia: 78 },
  ];

  // Ventas por cliente (top 10)
  const clientSalesData = [
    { cliente: 'Bodega El Sol', compras: 15800, visitas: 12, ticketPromedio: 1316, tendencia: 'up', porcentaje: 15 },
    { cliente: 'Minimarket Don José', compras: 12500, visitas: 10, ticketPromedio: 1250, tendencia: 'up', porcentaje: 8 },
    { cliente: 'Tienda La Esquina', compras: 11200, visitas: 8, ticketPromedio: 1400, tendencia: 'down', porcentaje: -3 },
    { cliente: 'Abarrotes María', compras: 9800, visitas: 15, ticketPromedio: 653, tendencia: 'up', porcentaje: 12 },
    { cliente: 'Bodega Central', compras: 8500, visitas: 7, ticketPromedio: 1214, tendencia: 'stable', porcentaje: 0 },
    { cliente: 'Market Express', compras: 7900, visitas: 9, ticketPromedio: 877, tendencia: 'up', porcentaje: 5 },
    { cliente: 'Super Ahorro', compras: 7200, visitas: 6, ticketPromedio: 1200, tendencia: 'down', porcentaje: -8 },
    { cliente: 'La Favorita', compras: 6800, visitas: 11, ticketPromedio: 618, tendencia: 'up', porcentaje: 20 },
  ];

  // Ventas por cantidad de productos
  const quantitySalesData = [
    { producto: 'Galleta Premium Chocolate', cantidadVendida: 1250, ingresos: 18750, stock: 450, rotacion: 'alta' },
    { producto: 'Galleta Clásica Vainilla', cantidadVendida: 980, ingresos: 9800, stock: 320, rotacion: 'alta' },
    { producto: 'Galleta Integral Avena', cantidadVendida: 720, ingresos: 10800, stock: 180, rotacion: 'media' },
    { producto: 'Galleta Premium Naranja', cantidadVendida: 650, ingresos: 9750, stock: 200, rotacion: 'media' },
    { producto: 'Galleta Rellena Fresa', cantidadVendida: 580, ingresos: 8700, stock: 150, rotacion: 'media' },
    { producto: 'Galleta Saludable Quinua', cantidadVendida: 420, ingresos: 8400, stock: 280, rotacion: 'baja' },
  ];

  // Datos de ventas por hora del día
  const hourlyData = [
    { hora: '6am', ventas: 850 },
    { hora: '7am', ventas: 1200 },
    { hora: '8am', ventas: 2100 },
    { hora: '9am', ventas: 3500 },
    { hora: '10am', ventas: 4200 },
    { hora: '11am', ventas: 3800 },
    { hora: '12pm', ventas: 2500 },
    { hora: '1pm', ventas: 1800 },
    { hora: '2pm', ventas: 2200 },
    { hora: '3pm', ventas: 3100 },
    { hora: '4pm', ventas: 3600 },
    { hora: '5pm', ventas: 2800 },
    { hora: '6pm', ventas: 1500 },
  ];

  // Proyecciones
  const projectionData = {
    metaMensual: 150000,
    ventasActuales: 125680,
    diasRestantes: 8,
    ventasDiariasNecesarias: 3040,
    proyeccionFinal: 149300,
    cumplimiento: 84,
  };

  const topProducts = mockProducts.slice(0, 5).map((p, i) => ({
    ...p,
    ventas: Math.floor(Math.random() * 500) + 100,
    ingresos: Math.floor(Math.random() * 5000) + 1000,
  })).sort((a, b) => b.ventas - a.ventas);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Reportes de Ventas
          </h1>
          <p className="text-muted-foreground">
            Análisis completo y KPIs de rendimiento comercial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards Row 1 - Principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] sm:text-xs">
                  <ArrowUp className="h-3 w-3" />
                  <span>12.5%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Ventas Mes</p>
              <p className="text-sm sm:text-lg font-bold text-foreground truncate">
                S/ {mockDashboardKPIs.sales.month.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] sm:text-xs">
                  <ArrowUp className="h-3 w-3" />
                  <span>8.2%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Ventas Hoy</p>
              <p className="text-sm sm:text-lg font-bold text-foreground truncate">
                S/ {mockDashboardKPIs.sales.today.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                </div>
                <div className="flex items-center gap-1 text-red-500 text-[10px] sm:text-xs">
                  <ArrowDown className="h-3 w-3" />
                  <span>3.1%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Ticket Promedio</p>
              <p className="text-sm sm:text-lg font-bold text-foreground truncate">S/ 135</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] sm:text-xs">
                  <ArrowUp className="h-3 w-3" />
                  <span>+5</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Clientes Activos</p>
              <p className="text-sm sm:text-lg font-bold text-foreground truncate">{mockDashboardKPIs.clients.active}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] sm:text-xs">
                  <ArrowUp className="h-3 w-3" />
                  <span>15%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Unidades Vendidas</p>
              <p className="text-sm sm:text-lg font-bold text-foreground truncate">4,580</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                </div>
                <Badge variant="secondary" className="text-[10px] sm:text-xs">5</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Vehículos Activos</p>
              <p className="text-sm sm:text-lg font-bold text-foreground truncate">5/6</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proyección y Meta */}
      <Card className="shadow-card bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Proyección del Mes</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Meta Mensual</p>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate">S/ {projectionData.metaMensual.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ventas Actuales</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 truncate">S/ {projectionData.ventasActuales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Días Restantes</p>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate">{projectionData.diasRestantes} días</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Venta Diaria Necesaria</p>
                  <p className="text-base sm:text-lg font-bold text-amber-600 truncate">S/ {projectionData.ventasDiariasNecesarias.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="lg:w-64">
              <div className="text-center mb-2">
                <span className="text-2xl sm:text-3xl font-bold text-primary">{projectionData.cumplimiento}%</span>
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
              </div>
              <Progress value={projectionData.cumplimiento} className="h-3" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                Proyección final: <span className="font-semibold">S/ {projectionData.proyeccionFinal.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto p-1 gap-1">
          <TabsTrigger value="general" className="text-xs sm:text-sm py-1.5">General</TabsTrigger>
          <TabsTrigger value="clientes" className="text-xs sm:text-sm py-1.5">Por Clientes</TabsTrigger>
          <TabsTrigger value="vehiculos" className="text-xs sm:text-sm py-1.5">Por Vehículos</TabsTrigger>
          <TabsTrigger value="productos" className="text-xs sm:text-sm py-1.5">Por Productos</TabsTrigger>
          <TabsTrigger value="tiempo" className="text-xs sm:text-sm py-1.5 col-span-2 sm:col-span-1">Por Tiempo</TabsTrigger>
        </TabsList>

        {/* Tab General */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Sales Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Ventas de la Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="ventas" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Ventas S/"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="meta" 
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      name="Meta"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trend with Projection */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Tendencia y Proyección Mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ventas" 
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                      name="Ventas Reales"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="proyeccion" 
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      name="Proyección"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Distribution */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Ventas por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-muted-foreground">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.ventas} unidades</p>
                      </div>
                      <p className="text-sm font-semibold">S/ {product.ingresos}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resumen Rápido */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Resumen Rápido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Ventas esta semana</span>
                    <span className="font-semibold">S/ 35,000</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Pedidos procesados</span>
                    <span className="font-semibold">218</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Clientes atendidos hoy</span>
                    <span className="font-semibold">42</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Mejor día del mes</span>
                    <span className="font-semibold text-emerald-600">Viernes - S/ 7,200</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Por Clientes */}
        <TabsContent value="clientes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Compradores Hoy</p>
                    <p className="text-2xl font-bold">42</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sin Compras (7 días)</p>
                    <p className="text-2xl font-bold text-amber-600">18</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Award className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Promedio Cliente</p>
                    <p className="text-2xl font-bold">S/ 982</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Ranking de Ventas por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientSalesData.map((client, index) => (
                  <div key={client.cliente} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      index < 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.cliente}</p>
                      <p className="text-xs text-muted-foreground">{client.visitas} visitas • Ticket prom: S/ {client.ticketPromedio}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">S/ {client.compras.toLocaleString()}</p>
                      <div className={`flex items-center gap-1 text-xs ${
                        client.tendencia === 'up' ? 'text-emerald-500' : 
                        client.tendencia === 'down' ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {client.tendencia === 'up' && <ArrowUp className="h-3 w-3" />}
                        {client.tendencia === 'down' && <ArrowDown className="h-3 w-3" />}
                        <span>{client.porcentaje > 0 ? '+' : ''}{client.porcentaje}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Por Vehículos */}
        <TabsContent value="vehiculos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ventas Vehículos</p>
                    <p className="text-2xl font-bold">S/ 136,200</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mejor Zona</p>
                    <p className="text-2xl font-bold">Sur</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Target className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eficiencia Promedio</p>
                    <p className="text-2xl font-bold">86.6%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Rendimiento por Vehículo Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicleSalesData.map((vehicle, index) => (
                  <div key={vehicle.vehiculo} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          index === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'
                        }`}>
                          <Truck className={`h-5 w-5 ${index === 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-semibold">{vehicle.vehiculo}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.vendedor} • Zona {vehicle.zona}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">S/ {vehicle.ventas.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.cantidadVentas} ventas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Eficiencia:</span>
                      <Progress value={vehicle.eficiencia} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{vehicle.eficiencia}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Por Productos */}
        <TabsContent value="productos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Unidades Vendidas</p>
                    <p className="text-2xl font-bold">4,600</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Producto Estrella</p>
                    <p className="text-lg font-bold">Premium Chocolate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio Promedio/Unidad</p>
                    <p className="text-2xl font-bold">S/ 14.50</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Ventas por Cantidad de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quantitySalesData.map((product, index) => (
                  <div key={product.producto} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      index < 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{product.producto}</p>
                      <p className="text-xs text-muted-foreground">Stock actual: {product.stock} unidades</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-lg font-bold">{product.cantidadVendida.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">unidades</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">S/ {product.ingresos.toLocaleString()}</p>
                      <Badge variant={
                        product.rotacion === 'alta' ? 'default' : 
                        product.rotacion === 'media' ? 'secondary' : 'outline'
                      } className="text-xs">
                        Rotación {product.rotacion}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Por Tiempo */}
        <TabsContent value="tiempo" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mejor Hora</p>
                  <p className="text-2xl font-bold text-primary">10:00 AM</p>
                  <p className="text-xs text-muted-foreground">S/ 4,200 promedio</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mejor Día</p>
                  <p className="text-2xl font-bold text-primary">Viernes</p>
                  <p className="text-xs text-muted-foreground">S/ 7,200 promedio</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Hora Baja</p>
                  <p className="text-2xl font-bold text-amber-600">12:00 PM</p>
                  <p className="text-xs text-muted-foreground">Hora de almuerzo</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Ventana Productiva</p>
                  <p className="text-2xl font-bold">8AM - 11AM</p>
                  <p className="text-xs text-muted-foreground">65% de las ventas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Ventas por Hora del Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hora" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ventas" 
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Ventas y Cantidad por Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-muted-foreground" />
                    <YAxis yAxisId="left" className="text-muted-foreground" />
                    <YAxis yAxisId="right" orientation="right" className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="ventas" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Ventas S/"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cantidad" 
                      stroke="hsl(var(--cookie-600))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--cookie-600))' }}
                      name="Cantidad"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesReports;
