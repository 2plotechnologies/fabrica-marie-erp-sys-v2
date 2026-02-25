import api from './api';

export interface RumaPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  condiciones?: string;
  capacidad_unidades: number;
  ubicacion_fisica: string;
  estado: string;
}

/* ============================
   SERVICIO
============================ */

export const rumaService = {
  /* Obtener todas los rumas */
  async getAll() {
    const response = await api.get('/inventario/rumas');
    return response.data;
  },

  /* Obtener ruma por ID */
  async getById(id: number) {
    const response = await api.get(`/inventario/rumas/${id}`);
    return response.data;
  },

  /* Crear ruma */
  async create(data: RumaPayload) {
    const response = await api.post('/inventario/rumas', data);
    return response.data;
  },

  /* Actualizar ruma */
  async update(data: RumaPayload, id:number) {
    const response = await api.put(`/inventario/ruma/${id}`, data);
    return response.data;
  },

  /* Eliminar ruma */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventario/ruma/${id}`);
  },
};
