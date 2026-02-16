// src/services/clienteService.ts
import api from './api';

export interface ClientePayload {
  codigo_cliente: string;
  razon_social: string;
  tipo_cliente?: string;
  direccion?: string;
  telefono?: string;
  ruta_id?: number | null;
  condicion_pago: string;
  limite_credito: number;
  dias_credito: number;
  activo: boolean;
}

export const clienteService = {

  async getRutas() {
    const response = await api.get('/rutas');
    return response.data;
  },

  async create(data: ClientePayload) {
    const response = await api.post('/clientes', data);
    return response.data;
  },

  async getAll() {
    const response = await api.get('/clientes');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/clientes/${id}`);
    return response.data;
  }

};
