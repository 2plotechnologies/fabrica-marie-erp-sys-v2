import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  MapPin,
  Truck,
  Wrench,
  UserCog,
  Gift,
  BarChart3,
  Settings,
  ChevronDown,
  Cookie,
  Menu,
  X,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  subItems?: { to: string; label: string }[];
}

const NavItem = ({ to, icon, label, subItems }: NavItemProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  const hasSubItems = subItems && subItems.length > 0;

  if (hasSubItems) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <span className="flex-shrink-0">{icon}</span>
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </button>
        {isOpen && (
          <div className="pl-10 space-y-1 animate-slide-up">
            {subItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary/20 text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
};

interface NavItemConfig {
  to: string;
  icon: React.ReactNode;
  label: string;
  module: string;
  subItems?: { to: string; label: string }[];
}

const navigation: NavItemConfig[] = [
  { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', module: 'dashboard' },
  { 
    to: '/almacen', 
    icon: <Package className="h-5 w-5" />, 
    label: 'Almacén',
    module: 'almacen',
    subItems: [
      { to: '/almacen/stock', label: 'Stock Actual' },
      { to: '/almacen/movimientos', label: 'Movimientos' },
      { to: '/almacen/productos', label: 'Productos' },
      { to: '/almacen/rumas', label: 'Gestión de Rumas' },
      { to: '/almacen/seguimiento', label: 'Seguimiento Productos' },
      { to: '/almacen/salida-fabrica', label: 'Salida de Fábrica' },
    ]
  },
  { 
    to: '/ventas', 
    icon: <ShoppingCart className="h-5 w-5" />, 
    label: 'Ventas',
    module: 'ventas',
    subItems: [
      { to: '/ventas/nueva', label: 'Nueva Venta' },
      { to: '/ventas/historial', label: 'Historial' },
      { to: '/ventas/detalle', label: 'Detalle Ventas' },
      { to: '/ventas/cobranzas', label: 'Cobranzas' },
      { to: '/ventas/resumen-diario', label: 'Resumen Diario' },
      { to: '/ventas/reportes', label: 'Reportes KPIs' },
    ]
  },
  { 
    to: '/clientes', 
    icon: <Users className="h-5 w-5" />, 
    label: 'Clientes',
    module: 'clientes',
    subItems: [
      { to: '/clientes/lista', label: 'Lista de Clientes' },
      { to: '/clientes/crm', label: 'CRM Seguimiento' },
      { to: '/clientes/deudas', label: 'Cuentas por Cobrar' },
      { to: '/clientes/morosos', label: 'Morosos' },
    ]
  },
  { 
    to: '/caja', 
    icon: <Wallet className="h-5 w-5" />, 
    label: 'Caja',
    module: 'caja',
    subItems: [
      { to: '/caja/actual', label: 'Caja Actual' },
      { to: '/caja/movimientos', label: 'Movimientos' },
      { to: '/caja/cierres', label: 'Cierres' },
      { to: '/caja/regularizacion', label: 'Regularización' },
    ]
  },
  { to: '/rutas', icon: <MapPin className="h-5 w-5" />, label: 'Rutas', module: 'rutas' },
  { 
    to: '/gps', 
    icon: <Navigation className="h-5 w-5" />, 
    label: 'GPS',
    module: 'gps',
    subItems: [
      { to: '/gps/seguimiento', label: 'Seguimiento' },
      { to: '/gps/reportes', label: 'Reportes' },
    ]
  },
  { to: '/vehiculos', icon: <Truck className="h-5 w-5" />, label: 'Vehículos', module: 'vehiculos' },
  { to: '/mantenimiento', icon: <Wrench className="h-5 w-5" />, label: 'Mantenimiento', module: 'mantenimiento' },
  { 
    to: '/rrhh', 
    icon: <UserCog className="h-5 w-5" />, 
    label: 'RRHH',
    module: 'rrhh',
    subItems: [
      { to: '/rrhh/empleados', label: 'Empleados' },
      { to: '/rrhh/bonos', label: 'Bonos' },
      { to: '/rrhh/asistencia', label: 'Asistencia' },
    ]
  },
  { to: '/fidelizacion', icon: <Gift className="h-5 w-5" />, label: 'Fidelización', module: 'fidelizacion' },
  { to: '/reportes', icon: <BarChart3 className="h-5 w-5" />, label: 'Reportes', module: 'reportes' },
  { to: '/configuracion', icon: <Settings className="h-5 w-5" />, label: 'Configuración', module: 'configuracion' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { currentRole, rolePermissions, roleLabels } = useRole();
  const { user } = useAuth();
  const userDisplayName = user?.nombre || user?.username || 'Usuario';
  const initials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(name => name[0]?.toUpperCase() ?? '')
    .join('') || 'US';
  
  // Filtrar navegación según permisos del rol
  const filteredNavigation = navigation.filter(item => 
    rolePermissions[currentRole]?.includes(item.module)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-gradient-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-warm flex items-center justify-center shadow-glow">
              <Cookie className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
            <h1 className="font-display text-sm font-bold text-sidebar-foreground leading-tight">
                Fabrica Rey del Centro
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Sistema Comercial</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNavigation.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {userDisplayName}
              </p>
              <p className="text-xs text-sidebar-foreground/60">{roleLabels[currentRole]}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export const MobileMenuButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    className="lg:hidden"
    onClick={onClick}
  >
    <Menu className="h-6 w-6" />
  </Button>
);
