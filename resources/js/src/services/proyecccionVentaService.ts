import api from "./api";

export const proyeccionVentaService = {
    async index() {
        const response = await api.get('/proyeccion-ventas');
        return response.data;
    },
    async store(data: any) {
        const response = await api.post('/proyeccion-ventas', data);
        return response.data;
    },
    async resumenMesActual() {
        const response = await api.get('/proyeccion-ventas/resumen-mes-actual');
        return response.data;
    }
}
