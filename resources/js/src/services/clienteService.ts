// src/services/clienteService.ts
import api from './api';

export interface ClientePayload {
  codigo_cliente: string;
  razon_social: string;
  tipo_cliente?: string;
  direccion?: string;
  departamento_id?: number | null;
  provincia_id?: number | null;
  distrito_id?: number | null;
  telefono?: string;
  ruta_id?: number | null;
  condicion_pago: string;
  limite_credito: number;
  dias_credito: number;
  deuda_actual: number;
  activo: boolean;
  status: string;
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
  },

  async update(id: number, data: ClientePayload) {
    const response = await api.put(`/clientes/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/clientes/${id}`);
    return response.data;
  },

  async listaCRM() {
    const response = await api.get('/clientes/crm');
    return response.data;
  },

  async getMorosos() {
    const response = await api.get('/clientes/morosos');
    return response.data;
  },

  async createInteraction(data: any) {
    const response = await api.post('/clientes/interacciones', data);
    return response.data;
  },

  async createTask(data: any) {
    const response = await api.post('/clientes/tareas', data);
    return response.data;
  },

  async completeTask(id: number) {
    const response = await api.put(`/clientes/tareas/${id}/completar`);
    return response.data;
  },
};
