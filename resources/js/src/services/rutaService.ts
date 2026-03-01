// src/services/clienteService.ts
import api from './api';

export interface RutaPayload {
  nombre: string;
  zona: string;
  descripcion: string;
  frecuencia: string;
  vendedor_id: number;
  clientes_estimados: number;
  estado: string;
}

export const rutaService = {

  async getVendedores() {
    const response = await api.get('/vendedores');
    return response.data;
  },

  async create(data: RutaPayload) {
    const response = await api.post('/rutas', data);
    return response.data;
  },

  async getAll() {
    const response = await api.get('/rutas');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/rutas/${id}`);
    return response.data;
  }

};
