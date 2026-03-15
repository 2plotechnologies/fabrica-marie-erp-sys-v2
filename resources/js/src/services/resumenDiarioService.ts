import api from "./api";

export const resumenDiarioService = {

    async getAll() {
        const response = await api.get('/resumen-diario');
        return response.data;
    },

    async getVendedores() {
        const response = await api.get('/vendedores');
        return response.data;
    },

    async getSalidas() {
        const response = await api.get('/resumen-diario/salidas');
        return response.data;
    },

    async getRutas() {
        const response = await api.get('/rutas');
        return response.data;
    },

    async getVehiculos() {
        const response = await api.get('/vehiculos');
        return response.data;
    },

    async getAutoResumenDiario(vendedor_id: string) {
        const response = await api.get(`/resumen-diario/${vendedor_id}`);
        return response.data;
    },

    async createResumenDiario(resumenDiario: any) {
        const response = await api.post('/resumen-diario', resumenDiario);
        return response.data;
    },

    async update(id: string, estado: string, observacion: string) {
        const response = await api.put(`/resumen-diario/${id}/estado`, { estado, observacion });
        return response.data;
    },

    async updateGasto(id: string, estado: string, observacion: string) {
        const response = await api.put(`/resumen-diario/gasto/${id}/estado`, { estado, observacion });
        return response.data;
    },

}