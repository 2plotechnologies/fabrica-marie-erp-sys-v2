import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:8000/api'; //En produccion sera: distribuidoramarie.com/api

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Servicio de autenticación
export const authService = {
    login: async (credentials) => {
        try {
            const response = await api.post('/login', credentials);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Error de conexión' };
        }
    },

    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('auth_token');
    }
};

export default api;
