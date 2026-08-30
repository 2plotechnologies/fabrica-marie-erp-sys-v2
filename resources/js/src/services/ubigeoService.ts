import api from './api';

export interface Departamento {
  idDepa: number;
  departamento: string;
}

export interface Provincia {
  idProv: number;
  provincia: string;
  idDepa: number;
}

export interface Distrito {
  idDist: number;
  distrito: string;
  idProv: number;
}

export const ubigeoService = {
  async getDepartamentos(): Promise<Departamento[]> {
    const response = await api.get('/ubigeo/departamentos');
    return response.data;
  },

  async getProvincias(idDepa: number): Promise<Provincia[]> {
    const response = await api.get(`/ubigeo/provincias/${idDepa}`);
    return response.data;
  },

  async getDistritos(idProv: number): Promise<Distrito[]> {
    const response = await api.get(`/ubigeo/distritos/${idProv}`);
    return response.data;
  },
};
