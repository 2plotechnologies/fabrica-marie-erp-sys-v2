import api from './api';

export const gastoService = {
  getGastos: async () => {
    const response = await api.get('/resumen-diario/gastos/all');
    return response.data;
  },
  createGasto: async (data: { vendedor_id: number; monto: number; comprobante?: string; tipo: string; fecha: string }) => {
    const response = await api.post('/resumen-diario/gastos', data);
    return response.data;
  },
  getVendedores: async () => {
    const response = await api.get('/vendedores');
    return response.data;
  },
  deleteGasto: async (id: number | string) => {
    const response = await api.delete(`/resumen-diario/gastos/${id}`);
    return response.data;
  }
};
