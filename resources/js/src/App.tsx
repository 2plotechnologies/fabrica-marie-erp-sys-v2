import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"; // Importamos AuthProvider y useAuth
import { MainLayout } from "@/components/layout/MainLayout";
import Login from "@/components/auth/login"; // Importamos el componente Login
import Dashboard from "@/pages/Dashboard";
import ClientsList from "@/pages/clients/ClientsList";
import ClientsCRM from "@/pages/clients/ClientsCRM";
import NewClient from "@/pages/clients/NewClient";
import AccountsReceivable from "@/pages/clients/AccountsReceivable";
import DelinquentClients from "@/pages/clients/DelinquentClients";
import StockList from "@/pages/stock/StockList";
import StockMovements from "@/pages/stock/StockMovements";
import ProductsList from "@/pages/stock/ProductsList";
import RumaManagement from "@/pages/stock/RumaManagement";
import ProductTracking from "@/pages/stock/ProductTracking";
import NewSale from "@/pages/sales/NewSale";
import SalesHistory from "@/pages/sales/SalesHistory";
import SalesReports from "@/pages/sales/SalesReports";
import SalesDetail from "@/pages/sales/SalesDetail";
import Collections from "@/pages/sales/Collections";
import DailySummary from "@/pages/sales/DailySummary";
import FactoryOutput from "@/pages/stock/FactoryOutput";
import CurrentCash from "@/pages/cash/CurrentCash";
import CashMovements from "@/pages/cash/CashMovements";
import CashClosures from "@/pages/cash/CashClosures";
import CashRegularization from "@/pages/cash/CashRegularization";
import RoutesList from "@/pages/routes/RoutesList";
import VehiclesList from "@/pages/vehicles/VehiclesList";
import MaintenanceList from "@/pages/maintenance/MaintenanceList";
import EmployeesList from "@/pages/hr/EmployeesList";
import EmployeeBonuses from "@/pages/hr/EmployeeBonuses";
import EmployeeAttendance from "@/pages/hr/EmployeeAttendance";
import GPSTracking from "@/pages/gps/GPSTracking";
import GPSReports from "@/pages/gps/GPSReports";
import LoyaltyProgram from "@/pages/loyalty/LoyaltyProgram";
import ReportsMain from "@/pages/reports/ReportsMain";
import SalesGrowthByZone from "@/pages/reports/SalesGrowthByZone";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotFound from "@/pages/NotFound";
import { JSX } from "react";

const queryClient = new QueryClient();

// Componente para proteger rutas que requieren autenticación
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Muestra un loader mientras verifica autenticación
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente para rutas públicas (como login) - redirige al dashboard si ya está autenticado
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente para manejar la ruta raíz
const RootHandler = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si está autenticado, va al dashboard
  // Si no, va al login
  return isAuthenticated()
    ? <Navigate to="/" replace />
    : <Navigate to="/login" replace />;
};

// Componente principal de rutas (necesita estar dentro del contexto de autenticación)
const AppRoutes = () => {
  return (
    <Routes>
      {/* Ruta raíz - redirige según autenticación */}
      <Route path="/" element={<RootHandler />} />

      {/* Login - solo accesible si NO está autenticado */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      {/* Todas las rutas protegidas van dentro de MainLayout */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Almacén */}
        <Route path="/almacen" element={<StockList />} />
        <Route path="/almacen/stock" element={<StockList />} />
        <Route path="/almacen/movimientos" element={<StockMovements />} />
        <Route path="/almacen/productos" element={<ProductsList />} />
        <Route path="/almacen/rumas" element={<RumaManagement />} />
        <Route path="/almacen/seguimiento" element={<ProductTracking />} />
        <Route path="/almacen/salida-fabrica" element={<FactoryOutput />} />

        {/* Ventas */}
        <Route path="/ventas" element={<SalesHistory />} />
        <Route path="/ventas/nueva" element={<NewSale />} />
        <Route path="/ventas/historial" element={<SalesHistory />} />
        <Route path="/ventas/detalle" element={<SalesDetail />} />
        <Route path="/ventas/cobranzas" element={<Collections />} />
        <Route path="/ventas/resumen-diario" element={<DailySummary />} />
        <Route path="/ventas/reportes" element={<SalesReports />} />

        {/* Clientes */}
        <Route path="/clientes" element={<ClientsList />} />
        <Route path="/clientes/lista" element={<ClientsList />} />
        <Route path="/clientes/crm" element={<ClientsCRM />} />
        <Route path="/clientes/nuevo" element={<NewClient />} />
        <Route path="/clientes/deudas" element={<AccountsReceivable />} />
        <Route path="/clientes/morosos" element={<DelinquentClients />} />
        <Route path="/clientes/cobrar" element={<AccountsReceivable />} />

        {/* Caja */}
        <Route path="/caja" element={<CurrentCash />} />
        <Route path="/caja/actual" element={<CurrentCash />} />
        <Route path="/caja/movimientos" element={<CashMovements />} />
        <Route path="/caja/cierres" element={<CashClosures />} />
        <Route path="/caja/regularizacion" element={<CashRegularization />} />

        {/* Rutas */}
        <Route path="/rutas" element={<RoutesList />} />

        {/* GPS */}
        <Route path="/gps" element={<GPSTracking />} />
        <Route path="/gps/seguimiento" element={<GPSTracking />} />
        <Route path="/gps/reportes" element={<GPSReports />} />

        {/* Otros módulos */}
        <Route path="/vehiculos" element={<VehiclesList />} />
        <Route path="/mantenimiento" element={<MaintenanceList />} />
        <Route path="/rrhh" element={<EmployeesList />} />
        <Route path="/rrhh/empleados" element={<EmployeesList />} />
        <Route path="/rrhh/bonos" element={<EmployeeBonuses />} />
        <Route path="/rrhh/asistencia" element={<EmployeeAttendance />} />
        <Route path="/fidelizacion" element={<LoyaltyProgram />} />
        <Route path="/reportes" element={<ReportsMain />} />
        <Route path="/reportes/crecimiento-zonas" element={<SalesGrowthByZone />} />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>

      {/* Ruta 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Componente principal App
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider> {/* AuthProvider envuelve todo */}
      <RoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
