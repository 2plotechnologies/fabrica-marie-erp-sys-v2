// Types for the cookie commercialization system

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  category: string;
  peso?: number; // Peso en gramos
  presentacion?: string; // Tipo de presentación (bolsa, caja, paquete, etc.)
  marca?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stock {
  id: string;
  productId: string;
  product?: Product;
  rumaId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  lastUpdated: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  type: 'ENTRADA' | 'SALIDA' | 'DEVOLUCION' | 'AJUSTE';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  userId: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  codigo: string;
  razon_social: string;
  address: string;
  phone: string;
  routeId?: string;
  creditLimit: number;
  currentDebt: number;
  status: 'ACTIVO' | 'INACTIVO' | 'MOROSO';
}

export interface Sale {
  id: string;
  clientId: string;
  client?: Client;
  sellerId: string;
  seller?: User;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentType: 'CONTADO' | 'CREDITO';
  status: 'PENDIENTE' | 'CONFIRMADA' | 'ANULADA';
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface AccountReceivable {
  id: string;
  clientId: string;
  client?: Client;
  saleId?: string;
  originalAmount: number;
  currentBalance: number;
  dueDate: Date;
  status: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  accountId: string;
  amount: number;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN';
  reference?: string;
  collectedBy: string;
  createdAt: Date;
}

export interface CashRegister {
  id: string;
  userId: string;
  openingBalance: number;
  closingBalance?: number;
  theoreticalBalance?: number;
  difference?: number;
  status: 'ABIERTA' | 'CERRADA';
  openedAt: Date;
  closedAt?: Date;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: 'INGRESO' | 'EGRESO';
  category: string;
  amount: number;
  description: string;
  reference?: string;
  createdAt: Date;
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  zone: string;
  assignedSellerId?: string;
  assignedSeller?: User;
  clientCount: number;
  status: 'ACTIVA' | 'INACTIVA';
  createdAt: Date;
}

export interface Visit {
  id: string;
  clientId: string;
  client?: Client;
  sellerId: string;
  startTime: Date;
  endTime?: Date;
  latitude?: number;
  longitude?: number;
  notes?: string;
  hadSale: boolean;
  saleId?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  assignedDriverId?: string;  // Chofer asignado
  assignedSellerId?: string;  // Vendedor asignado
  status: 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO';
  lastMaintenance?: Date;
  nextMaintenance?: Date;
}

// Seguimiento de productos
export interface ProductTracking {
  id: string;
  productId: string;
  product?: Product;
  batchNumber: string;
  quantity: number;
  status: 'EN_ALMACEN' | 'EN_TRANSITO' | 'ENTREGADO' | 'DEVUELTO';
  currentLocation: string;
  vehicleId?: string;
  sellerId?: string;
  clientId?: string;
  saleId?: string;
  history: ProductTrackingHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductTrackingHistory {
  id: string;
  trackingId: string;
  status: string;
  location: string;
  notes?: string;
  userId: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status: 'ACTIVO' | 'INACTIVO';
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | 'ADMIN'
  | 'GERENTE'
  | 'SUPERVISOR'
  | 'VENDEDOR'
  | 'ALMACENERO'
  | 'CAJERO'
  | 'RRHH'
  | 'FIDELIZACION'
  | 'MANTENIMIENTO';

// Dashboard KPIs
export interface DashboardKPIs {
  sales: {
    today: number;
    week: number;
    month: number;
    todayCount: number;
  };
  collections: {
    today: number;
    pending: number;
    overdue: number;
  };
  stock: {
    lowStockCount: number;
    totalProducts: number;
    totalValue: number;
  };
  clients: {
    total: number;
    active: number;
    delinquent: number;
  };
  routes: {
    completedToday: number;
    visitedClients: number;
    efficiency: number;
  };
}
