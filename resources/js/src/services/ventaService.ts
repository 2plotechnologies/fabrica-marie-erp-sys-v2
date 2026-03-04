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
  subtotal:number;
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
    const response = await api.put(`/ventas/${id}/confirmar`, {
        estado: "CONFIRMADA",
    });
    return response.data;
    },

    // Anular
    async anularVenta(id: number) {
    const response = await api.put(`/ventas/${id}/anular`, {
        estado: "ANULADA",
    });
    return response.data;
    },

   delete: async (id: number): Promise<void> => {
    await api.delete(`/ventas/${id}`);
  },

};
