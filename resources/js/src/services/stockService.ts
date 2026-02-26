import api from './api';

/* ============================
   SERVICIO
============================ */

export const stockService = {

  //Obtener Rumas.
  async getRumas() {
    const response = await api.get('/inventario/rumas');
    return response.data;
  },
 /* Obtener todas los movimientos */
  async getAll() {
    const response = await api.get('/inventario/stock');
    return response.data;
  },

  /* Obtener ruma por ID */
  async getMovimientos(id: number) {
    const response = await api.get(`/inventario/stock/movimientos/${id}`);
    return response.data;
  },

  /* Eliminar emovimiento */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventario/movimiento/${id}`);
  },
};
