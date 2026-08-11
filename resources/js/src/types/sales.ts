// Types for the enhanced sales module

export interface CartItem {
  salida_id: number | null;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  marca?: string;
  presentacion?: string;
  peso?: number;
  tipo_venta?: 'UNIDAD' | 'GRANEL';
  esBonificacion?: boolean;
  esDegustacion?: boolean;
}

export interface SaleFormData {
  clientId: string;
  items: CartItem[];
  paymentType: 'CONTADO' | 'CREDITO';
  discount: number;
  bonificaciones: CartItem[];
  degustaciones: CartItem[];
  observaciones?: string;
}
