import api from './api';



export const cajaService = {
    // Abrir caja
    async abrirCaja(data: { monto_apertura: number }) {
        const response = await api.post('/caja/abrir', data);
        return response.data;
    },
    // Cerrar caja
    async cerrarCaja(id: number, monto_cierre: number, conteo_real: number) {
        const response = await api.post(`/caja/${id}/cerrar`, { monto_cierre, conteo_real });
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
    async createMovimiento(data: { caja_id: number, fecha: string, tipo: string, categoria: string, descripcion: string, monto: number }) {
        const response = await api.post('/caja/movimientos', data);
        return response.data;
    },

    // Obtener movimientos totales
    async getMovimientosTotales() {
        const response = await api.get('/caja/movimientos/total');
        return response.data;
    },

    //Obtener egresos sin validar
    async getEgresos() {
        const response = await api.get('/caja/egresos');
        return response.data;
    },

    //Actualizar estado de egreso
    async actualizarEstadoEgreso(id: string, data: { estado: string, motivo: string }) {
        const response = await api.post(`/caja/egresos/${id}/estado`, data);
        return response.data;
    },

    //Obtener Cajas Cerradas
    async getCajasCerradas() {
        const response = await api.get('/caja/cerradas');
        return response.data;
    },

    // Obtener salidas de caja
    async getSalidasCaja() {
        const response = await api.get('/caja/salidas');
        return response.data;
    },

    // Crear salida de caja
    async createSalidaCaja(data: { destinatario: string, motivo: string, entregado: number }) {
        const response = await api.post('/caja/salidas', data);
        return response.data;
    },

    // Crear salida de caja
    async entregarSalidaCaja(data: { id: number }) {
        const response = await api.post(`/caja/salidas/${data.id}/entregar`);
        return response.data;
    },

    // Liquidar salida de caja
    async liquidarSalidaCaja(data: { id: number, usado: number, vuelto: number, comprobante: string }) {
        const response = await api.post(`/caja/salidas/${data.id}/liquidar`, data);
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

    // Obtener cajas sin cerrar de días anteriores
    async getCajasSinCerrar() {
        const response = await api.get('/caja/sin-cerrar');
        return response.data;
    },

    // Cerrar automáticamente las cajas de días anteriores
    async cerrarCajasAntiguas() {
        const response = await api.post('/caja/cerrar-antiguas');
        return response.data;
    },
}