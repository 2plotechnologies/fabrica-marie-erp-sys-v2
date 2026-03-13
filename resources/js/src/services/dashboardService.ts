import api from "./api";

export const dashboardService = {
    async getDashboardAGS() {
        const response = await api.get('/dashboard/ags');
        return response.data;
    },
}