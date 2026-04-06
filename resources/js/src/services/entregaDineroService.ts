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
    }
}
