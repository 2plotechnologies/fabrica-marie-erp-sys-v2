import api from "./api";


export const detalleVentaService = {
    async getVendedores() {
        const response = await api.get("/vendedores");
        return response.data;
    },
    async getDetalleVentas(params: any) {
        const response = await api.get("/ventas/reportes/detalle-ventas", { params });
        return response.data;
    }
}