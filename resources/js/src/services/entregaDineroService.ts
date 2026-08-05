import api from "./api";

export const entregaDineroService = {
    async getAll() {
        const response = await api.get('/entregas-dinero');
        return response.data;
    },

    async getById(id: number) {
        const response = await api.get(`/entregas-dinero/${id}`);
        return response.data;
    },

    async create(data: FormData) {
        const response = await api.post('/entregas-dinero', data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async updateEstado(id: number, estado: string, confirmar_cierre_irregular?: boolean) {
        const response = await api.put(`/entregas-dinero/${id}/estado`, { estado, confirmar_cierre_irregular });
        return response.data;
    },

    async getReporte(fecha_desde?: string, fecha_hasta?: string) {
        const params: any = {};
        if (fecha_desde) params.fecha_desde = fecha_desde;
        if (fecha_hasta) params.fecha_hasta = fecha_hasta;
        
        const response = await api.get('/entregas-dinero/reporte', { params });
        return response.data;
    },

    async getResumenVendedor() {
        const response = await api.get('/entregas-dinero/resumen-vendedor');
        return response.data;
    }
}
