import api from "./api";

export const mapaInteractivoService = {
    async getMapboxToken() {
        const res = await api.get('/mapbox-token');
        return res.data;
    },
    async saveMapboxToken(token: string) {
        const res = await api.post('/mapbox-token', { token });
        return res.data;
    },

    async getClientes() {
        const res = await api.get('/clientes');
        return res.data;
    },

    async getClientesMapa() {
        const res = await api.get('/clientes-mapa');
        return res.data;
    },
    async saveClienteUbicacion(cliente: any) {
        const res = await api.post('/clientes-mapa/ubicacion', cliente);
        return res.data;
    },

    async getRutas() {
        const res = await api.get('/rutas');
        return res.data;
    },

    async getRutasMapa() {
        const res = await api.get('/rutas-mapa');
        return res.data;
    },

    async saveRuta(ruta: any) {
        console.log(ruta);
        const res = await api.post('/rutas-mapa', ruta);
        return res.data;
    },

    async getZonas() {
        const res = await api.get('/zonas');
        return res.data;
    },

    async saveZona(zona: any) {
        const res = await api.post('/zonas', zona);
        return res.data;
    },
}