import api from './api';

/* ============================
   TIPOS
============================ */

export interface SalidaPayload {
  fecha: string,
  vendedor_id: number,
  conductor: string,
  vehiculo_id: number,
  zona: string,
  ruta_id: number,
  estado: string,
  items: SalidaItemPayload[];
}

export interface SalidaItemPayload {
  producto_id: number;
  ruma_id: number;
  cantidad: number;
  es_sobrante?: boolean;
}

/* ============================
   SERVICIO
============================ */



export const salidaService = {
  //Obtener productos.
  async getProductos() {
    const response = await api.get('/inventario/productos');
    return response.data;
  },
  //Obtener Rumas.
  async getRumas() {
    const response = await api.get('/inventario/rumas');
    return response.data;
  },
    //Obtener vehiculos.
  async getVehiculos() {
    const response = await api.get('/vehiculos');
    return response.data;
  },
  //Obtener vendedores activos.
  async getVendedores() {
    const response = await api.get('/vendedores');
    return response.data;
  },
  //Obtener rutas.
  async getRutas() {
    const response = await api.get('/rutas');
    return response.data;
  },
 /* Obtener todas las salidas. */
  async getAll() {
    const response = await api.get('/inventario/salidas');
    return response.data;
  },

  /* Obtener salida por ID. */
  async getById(id: number) {
    const response = await api.get(`/inventario/salidas/${id}`);
    return response.data;
  },

  /* Crear salida. */
  async create(data: SalidaPayload) {
    const response = await api.post('/inventario/salidas', data);
    return response.data;
  },
  //Actualizar estado
  async updateEstado(id: number, estado: string) {
    const response = await api.put(`/inventario/salidas/estado/${id}`, { estado });
    return response.data;
  },
  //Obtener sobrantes del vehiculo
  async getSobrantes(vehiculoId: string) {
    const response = await api.get(`/inventario/salidas/vehiculo/${vehiculoId}/sobrantes`);
    return response.data;
  }
};
