// src/services/clienteService.ts
import api from './api';

export interface VehiculoPayload {
  placa: string;
  tipo: string;
  marca: string;
  modelo: string;
  chofer: string;
  anio: string;
  estado: string;
  activo: number;
}

export const vehiculoService = {

  async create(data: VehiculoPayload) {
    const response = await api.post('/vehiculos', data);
    return response.data;
  },

  async getAll() {
    const response = await api.get('/vehiculos');
    return response.data;
  },

  async getVendedores() {
    const response = await api.get('/vendedores');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/vehiculos/${id}`);
    return response.data;
  },

  async assignVendedor(vendedor_id: string, vehiculo_id: string) {
    const response = await api.post(`/vehiculos/${vehiculo_id}/vendedor`, { vendedor_id });
    return response.data;
  },

  //Actualizar estado
  delete: async (id: number): Promise<void> => {
    await api.delete(`/vehiculos/${id}`);
  },

};
