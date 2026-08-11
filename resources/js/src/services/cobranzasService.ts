import api from "./api";

export const cobranzasService = {
    async getVendedores() {
        const response = await api.get("/vendedores");
        return response.data;
    },
    async getCuentasPorCobrar() {
        const response = await api.get("/cuentas_por_cobrar");
        return response.data;
    },

    async getPagosCuenta(cuentaId: string) {
        const response = await api.get(`/cuentas_por_cobrar/${cuentaId}/abonos`);
        return response.data;
    },

    async registrarAbono(cuentaId: string, abono: any) {
        const response = await api.post(`/cuentas_por_cobrar/${cuentaId}/abonos`, abono);
        return response.data;
    },

    async fechaVencimiento(cuentaId: string, fecha_vencimiento: string) {
        return api.put(`/cuentas_por_cobrar/${cuentaId}/fecha_vencimiento`, { fecha_vencimiento });
    },

    async anularAbono(abonoId: string | number) {
        const response = await api.post(`/cuentas_por_cobrar/abonos/${abonoId}/anular`);
        return response.data;
    },
}