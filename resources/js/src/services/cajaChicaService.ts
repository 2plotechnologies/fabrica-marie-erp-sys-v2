import api from './api';

export interface ViaticoPayload {
    vendedor_id: number;
    tipo: string;
    fecha: string;
    monto: number;
    zona: string;
    ruta_id: number;
    descripcion: string;
}

export const cajaChicaService = {
    async getAll() {
        const response = await api.get('/caja_chica/viaticos');
        return response.data;
    },

    async getVendedores() {
        const response = await api.get('/vendedores');
        return response.data;
    },

    async getRutas() {
        const response = await api.get('/rutas');
        return response.data;
    },

    async getById(id: number) {
        const response = await api.get(`/caja_chica/viaticos/${id}`);
        return response.data;
    },

    async createViatico(viatico: ViaticoPayload) {
        const response = await api.post('/caja_chica/viaticos', viatico);
        return response.data;
    },

    async updateViatico(id: number, viatico: ViaticoPayload) {
        const response = await api.put(`/caja_chica/viaticos/${id}`, viatico);
        return response.data;
    },

    async updateViaticoEstado(id: number, estado: string) {
        const response = await api.put(`/caja_chica/viaticos/${id}/estado`, { estado });
        return response.data;
    },

    // Liquidar salida de caja
    async liquidarViatico(data: { id: number, usado: number, vuelto: number, comprobante: string }) {
        const response = await api.post(`/caja_chica/viaticos/${data.id}/liquidar`, data);
        return response.data;
    },

    async deleteViatico(id: number) {
        const response = await api.delete(`/caja_chica/viaticos/${id}`);
        return response.data;
    },
};