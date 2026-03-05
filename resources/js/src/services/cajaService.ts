import api from './api';



export const cajaService = {
    // Abrir caja
    async abrirCaja(data: { monto_apertura: number }) {
        const response = await api.post('/caja/abrir', data);
        return response.data;
    },
    // Cerrar caja
    async cerrarCaja(id: number, monto_cierre: number) {
        const response = await api.put(`/caja/${id}/cerrar`, { monto_cierre });
        return response.data;
    },

    // Obtener caja
    async getCaja() {
        const response = await api.get('/caja');
        return response.data;
    },

    // Obtener caja por ID
    async getCajaById(id: number) {
        const response = await api.get(`/caja/${id}`);
        return response.data;
    },

    // Crear movimiento
    async createMovimiento(data: { fecha: string, tipo: string, categoria: string, subcategoria: string, descripcion: string, monto: number, referencia_tipo: string, referencia_id: number }) {
        const response = await api.post('/caja/movimiento', data);
        return response.data;
    },

    // Obtener caja por usuario
    async getCajaByUsuario(usuario_id: number) {
        const response = await api.get(`/caja/usuario/${usuario_id}`);
        return response.data;
    },

    // Obtener caja por fecha
    async getCajaByFecha(fecha: string) {
        const response = await api.get(`/caja/fecha/${fecha}`);
        return response.data;
    },

    // Obtener caja por fecha y usuario
    async getCajaByFechaAndUsuario(fecha: string, usuario_id: number) {
        const response = await api.get(`/caja/fecha/${fecha}/usuario/${usuario_id}`);
        return response.data;
    },

    // Obtener caja por fecha y usuario y estado
    async getCajaByFechaAndUsuarioAndEstado(fecha: string, usuario_id: number, estado: string) {
        const response = await api.get(`/caja/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}`);
        return response.data;
    },

    // Obtener caja por fecha y usuario y estado y metodo de pago
    async getCajaByFechaAndUsuarioAndEstadoAndMetodoPago(fecha: string, usuario_id: number, estado: string, metodo_pago: string) {
        const response = await api.get(`/caja/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}/metodo_pago/${metodo_pago}`);
        return response.data;
    },

    // Obtener caja por fecha y usuario y estado y metodo de pago y tipo de venta
    async getCajaByFechaAndUsuarioAndEstadoAndMetodoPagoAndTipoVenta(fecha: string, usuario_id: number, estado: string, metodo_pago: string, tipo_venta: string) {
        const response = await api.get(`/caja/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}/metodo_pago/${metodo_pago}/tipo_venta/${tipo_venta}`);
        return response.data;
    },

    // Obtener caja por fecha y usuario y estado y metodo de pago y tipo de venta y producto
    async getCajaByFechaAndUsuarioAndEstadoAndMetodoPagoAndTipoVentaAndProducto(fecha: string, usuario_id: number, estado: string, metodo_pago: string, tipo_venta: string, producto_id: number) {
        const response = await api.get(`/caja/fecha/${fecha}/usuario/${usuario_id}/estado/${estado}/metodo_pago/${metodo_pago}/tipo_venta/${tipo_venta}/producto/${producto_id}`);
        return response.data;
    },
}