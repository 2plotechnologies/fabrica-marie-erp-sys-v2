// src/services/EmpleadoService.ts
import api from './api';

export interface EmpleadoPayload {
  nombre: string;
  username: string;
  email: string;
  password: string;
  rol: number;
  sueldo_base: number;
  horas_extra: number;
  afp: number;
}

export interface Role {
  id: number;
  nombre: string;
}

export const empleadoService = {

  async getRoles(): Promise<Role[]> {
        const response = await api.get('/admin/roles');
        return response.data;
    },

    create: async (data: EmpleadoPayload) => {
        const response = await api.post('/admin/usuarios', {
            username: data.username,
            email: data.email,
            password: data.password,
            nombre: data.nombre,
            roles: [data.rol], // 👈 aquí está la magia
            sueldo_base: data.sueldo_base,
            horas_extra: data.horas_extra,
            afp: data.afp,
        });

        return response.data;
  },

  async getAll() {
    const response = await api.get('/admin/usuarios');
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/admin/usuario/${id}`);
    return response.data;
  }

};
