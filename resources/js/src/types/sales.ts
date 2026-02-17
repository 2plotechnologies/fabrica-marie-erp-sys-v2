// Types for the enhanced sales module

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  marca?: string;
  presentacion?: string;
  peso?: number;
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
