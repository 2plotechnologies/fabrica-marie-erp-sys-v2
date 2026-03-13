// src/services/clienteService.ts
import api from './api';

export interface RutaPayload {
  nombre: string;
  zona: string;
  descripcion: string;
  frecuencia: string;
  vendedor_id: number;
  clientes_estimados: number;
  activo?: boolean;
}

export interface RutaVendedorPayload {
  vendedor_id: number | null;
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
  },

  async getDetail(id: number) {
    const response = await api.get(`/rutas/${id}/detalle`);
    return response.data;
  },

  async update(id: number, data: Partial<RutaPayload>) {
    const response = await api.put(`/rutas/${id}`, data);
    return response.data;
  },

  async reassignSeller(id: number, data: RutaVendedorPayload) {
    const response = await api.put(`/rutas/${id}/reasignar-vendedor`, data);
    return response.data;
  },

  async getClientes(id: number) {
    const response = await api.get(`/rutas/${id}/clientes`);
    return response.data;
  }

};
