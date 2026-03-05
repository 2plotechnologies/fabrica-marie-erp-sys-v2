import api from './api';

/* ============================
   TIPOS
============================ */

export interface VentaPayload {
  cliente_id: number,
  vendedor_id: number,
  tipo_pago: string,
  metodo_pago_detalle: string,
  adelanto: number,
  subtotal: number,
  descuento: number,
  total_neto: number,
  items: VentaItemPayload[];
}

export interface VentaItemPayload {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  es_bonificacion: boolean;
  es_degustacion: boolean;
}

/* ============================
   SERVICIO
============================ */



export const ventaService = {
  //Obtener productos.
  async getProductos() {
    const response = await api.get('/inventario/productos');
    return response.data;
  },
  //Obtener clientes.
  async getClientes() {
    const response = await api.get('/clientes');
    return response.data;
  },
  //Obtener vendedores activos.
  async getVendedores() {
    const response = await api.get('/vendedores');
    return response.data;
  },
  /* Obtener todas las ventas. */
  async getAll() {
    const response = await api.get('/ventas');
    return response.data;
  },

  /* Obtener venta por ID. */
  async getById(id: number) {
    const response = await api.get(`/ventas/${id}`);
    return response.data;
  },

  /* Crear venta. */
  async create(data: VentaPayload) {
    const response = await api.post('/ventas', data);
    return response.data;
  },

  /* Actualizar venta. */
  async update(id: number, data: VentaPayload) {
    const response = await api.put(`/ventas${id}/`, data);
    return response.data;
  },

  // Confirmar
  async confirmarVenta(id: number) {
    const response = await api.post(`/ventas/${id}/confirmar`);
    return response.data;
  },

  // Anular
  async anularVenta(id: number) {
    const response = await api.put(`/ventas/${id}/anular`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/ventas/${id}`);
  },

  // Obtener ventas por fecha
  async getVentasByFecha(fecha: string) {
    const response = await api.get(`/ventas/fecha/${fecha}`);
    return response.data;
  },

  // Obtener ventas por fecha y usuario
  async getVentasByFechaAndUsuario(fecha: string, usuario_id: number) {
    const response = await api.get(`/ventas/fecha/${fecha}/usuario/${usuario_id}`);
    return response.data;
  },

  // Obtener ventas por fecha y usuario y estado
  async getVentasByFechaAndUsuarioAndEstado(fecha: string, usuario_id: number, estado: string) {
    const response = await api.get(`/ventas/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}`);
    return response.data;
  },

  // Obtener ventas por fecha y usuario y estado y metodo de pago
  async getVentasByFechaAndUsuarioAndEstadoAndMetodoPago(fecha: string, usuario_id: number, estado: string, metodo_pago: string) {
    const response = await api.get(`/ventas/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}/metodo_pago/${metodo_pago}`);
    return response.data;
  },

  // Obtener ventas por fecha y usuario y estado y metodo de pago y tipo de venta
  async getVentasByFechaAndUsuarioAndEstadoAndMetodoPagoAndTipoVenta(fecha: string, usuario_id: number, estado: string, metodo_pago: string, tipo_venta: string) {
    const response = await api.get(`/ventas/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}/metodo_pago/${metodo_pago}/tipo_venta/${tipo_venta}`);
    return response.data;
  },

  // Obtener ventas por fecha y usuario y estado y metodo de pago y tipo de venta y producto
  async getVentasByFechaAndUsuarioAndEstadoAndMetodoPagoAndTipoVentaAndProducto(fecha: string, usuario_id: number, estado: string, metodo_pago: string, tipo_venta: string, producto_id: number) {
    const response = await api.get(`/ventas/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}/metodo_pago/${metodo_pago}/tipo_venta/${tipo_venta}/producto/${producto_id}`);
    return response.data;
  },

};
