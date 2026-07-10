import api from './api';

/* ============================
   TIPOS
============================ */

export interface MovimientoPayload {
  //id: string;
  tipo: string;
  cantidad: number;
  ruma_id: string;
  producto_id: string;
  motivo: string;
}

/* ============================
   SERVICIO
============================ */



export const movimientoService = {
    //Obtener productos.
  async getProductos() {
    const response = await api.get('/inventario/productos');
    return response.data;
  },
  //Obtener Rumas.
  async getRumas() {
    const response = await api.get('/inventario/rumas');
    return response.data;
  },
 /* Obtener todas los movimientos */
  async getAll() {
    const response = await api.get('/inventario/movimientos');
    return response.data;
  },

  /* Obtener ruma por ID */
  async getById(id: number) {
    const response = await api.get(`/inventario/movimientos/${id}`);
    return response.data;
  },

  /* Crear ruma */
  async create(data: MovimientoPayload) {
    const response = await api.post('/inventario/movimientos', data);
    return response.data;
  },

  /* Actualizar ruma */
  async update(data: MovimientoPayload, id:number) {
    const response = await api.put(`/inventario/movimiento/${id}`, data);
    return response.data;
  },

  /* Eliminar ruma / Revertir movimiento */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventario/movimientos/${id}`);
  },
};
