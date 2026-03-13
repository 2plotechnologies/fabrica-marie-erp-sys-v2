import api from './api';

export const regularizacionService = {

    async getAll() {
        const response = await api.get(`/regularizaciones`);
        return response.data;
    },

    async getCierreCajaSinCuadrar(fecha_cierre: string) {
        const response = await api.post(`/regularizaciones/cierre_sin_cuadrar`, { fecha_cierre });
        return response.data;
    },

    async storeRegularizacion(data: any) {
        const response = await api.post(`/regularizaciones`, data);
        return response.data;
    },

    async updateEstadoRegularizacion(id: number, data: any) {
        const response = await api.put(`/regularizaciones/${id}/estado`, data);
        return response.data;
    },
}