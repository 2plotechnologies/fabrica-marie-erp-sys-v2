// src/services/clienteService.ts
import api from './api';

export interface MantenimientoPayload {
  tipo: string;
  descripcion: string;
  fecha_programada: string;
  costo_estimado: string;
  taller: string;
  vehiculo_id: number;
  estado: string;
}

export const mantenimientoService = {

  async create(data: MantenimientoPayload) {
    const response = await api.post('/mantenimientos', data);
    return response.data;
  },

  async getAll() {
    const response = await api.get('/mantenimientos');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/mantenimientos/${id}`);
    return response.data;
  },

   delete: async (id: number): Promise<void> => {
    await api.delete(`/mantenimientos/${id}`);
  },

   //Actualizar estado
  async updateEstado(id: number, estado: string) {
    const response = await api.put(`/mantenimientos/estado/${id}`, { estado });
    return response.data;
  }

};
