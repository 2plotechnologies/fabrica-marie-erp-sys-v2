import api from './api';

/* ============================
   TIPOS
============================ */

export type EstadoProducto = 'ACTIVO' | 'INACTIVO';

export interface ProductoPayload {
  sku: string;
  categoria: string;
  nombre: string;
  descripcion?: string;
  presentacion?: string;
  marca?: string;
  unidad_medida: string;
  precio_base: number;
  costo: number;
  stock_minimo: number;
  activo: boolean;
}

export interface Producto extends ProductoPayload {
  id: number;
  created_at: string;
  created_by: number;
}

/* ============================
   SERVICIO
============================ */

export const productoService = {
  /* Obtener todos los productos */
  getAll: async (): Promise<Producto[]> => {
    const response = await api.get('/inventario/productos');
    return response.data;
  },

  /* Obtener producto por ID */
  getById: async (id: number): Promise<Producto> => {
    const response = await api.get(`/inventario/productos/${id}`);
    return response.data;
  },

  /* Crear producto */
  create: async (data: ProductoPayload): Promise<Producto> => {
    const response = await api.post('/inventario/productos', data);
    return response.data;
  },

  /* Actualizar producto */
  update: async (id: number, data: ProductoPayload): Promise<Producto> => {
    const response = await api.put(`/inventario/productos/${id}`, data);
    return response.data;
  },

  /* Eliminar producto */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventario/productos/${id}`);
  },
};
