import api from "./api";

export const dashboardService = {
    async getDashboardAGS() {
        const response = await api.get('/dashboard/ags');
        return response.data;
    },

    async getDashboardVendedor() {
        const response = await api.get('/dashboard/vendedor');
        return response.data;
    },

    async getDashboardAlmacenero() {
        const response = await api.get('/dashboard/almacenero');
        return response.data;
    },

    async getDashboardCajero() {
        const response = await api.get('/dashboard/cajero');
        return response.data;
    },

    async getDashboardMantenimiento() {
        const response = await api.get('/dashboard/mantenimiento');
        return response.data;
    },
}