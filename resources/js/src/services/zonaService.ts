import api from './api';

export interface ZonaPuntoData {
  latitud: number;
  longitud: number;
  orden?: number;
}

export interface ZonaData {
  id?: number | string;
  nombre: string;
  color: string;
  puntos?: ZonaPuntoData[];
}

export const zonaService = {
  async getAll() {
    const response = await api.get('/zonas');
    return response.data;
  },

  async create(data: { nombre: string; color: string; puntos?: ZonaPuntoData[] }) {
    const response = await api.post('/zonas', data);
    return response.data;
  },

  async update(id: number | string, data: { nombre?: string; color?: string; puntos?: ZonaPuntoData[] }) {
    const response = await api.put(`/zonas/${id}`, data);
    return response.data;
  },

  async delete(id: number | string) {
    const response = await api.delete(`/zonas/${id}`);
    return response.data;
  },

  async assignPoints(id: number | string, puntos: ZonaPuntoData[], nombre?: string, color?: string) {
    const response = await api.post('/zonas', {
      zona_id: id,
      nombre,
      color,
      puntos,
    });
    return response.data;
  }
};
