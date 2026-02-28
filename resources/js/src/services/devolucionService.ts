import api from './api';

/* ============================
   TIPOS
============================ */

export interface DevolucionPayload {
  fecha: string,
  vendedor_id: number,
  tipo: string,
  motivo: string,
  observaciones: string,
  estado: string,
  items: DevolucionItemPayload[];
}

export interface DevolucionItemPayload {
  producto_id: number;
  cantidad: number;
  motivo: string;
}

/* ============================
   SERVICIO
============================ */



export const devolucionService = {
  //Obtener productos.
  async getProductos() {
    const response = await api.get('/inventario/productos');
    return response.data;
  },

  //Obtener vendedores activos.
  async getVendedores() {
    const response = await api.get('/vendedores');
    return response.data;
  },

 /* Obtener todas las devoluciones. */
  async getAll() {
    const response = await api.get('/inventario/devoluciones');
    return response.data;
  },

  /* Obtener devolucion por ID. */
  async getById(id: number) {
    const response = await api.get(`/inventario/devoluciones/${id}`);
    return response.data;
  },

  /* Crear devolucion. */
  async create(data: DevolucionPayload) {
    const response = await api.post('/inventario/devoluciones', data);
    return response.data;
  },
  //Actualizar estado
  async updateEstado(id: number, estado: string) {
    const response = await api.put(`/inventario/devoluciones/estado/${id}`, { estado });
    return response.data;
  }
};
