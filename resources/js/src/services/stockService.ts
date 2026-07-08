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

  /* Obtener stock de vendedores */
  async getStockVendedores() {
    const response = await api.get('/inventario/stock-vendedores');
    return response.data;
  },

  /* Obtener vendedores */
  async getVendedores() {
    const response = await api.get('/vendedores');
    return response.data;
  },

  /* Transferir stock entre vendedores */
  async transferirStock(data: { origen_vendedor_id: number; destino_vendedor_id: number }) {
    const response = await api.post('/inventario/stock/transferir', data);
    return response.data;
  },
};
