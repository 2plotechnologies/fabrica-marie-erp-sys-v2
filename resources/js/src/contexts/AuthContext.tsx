/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '@/services/api';

interface User {
    id: number;
    username: string;
    email: string;
    nombre: string;
    activo: number;
    ultimo_login: string;
    roles: any[];
}

interface AuthContextType {
    user: User | null;
    roles: any[];
    permisos: any[];
    loading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    hasPermission: (permisoCodigo: string) => boolean;
    hasRole: (rolNombre: string) => boolean;
    isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [permisos, setPermisos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = () => {
            const storedUser = localStorage.getItem('user_data');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    setUser(userData.user);
                    setRoles(userData.roles || []);
                    setPermisos(userData.permisos || []);
                } catch (e) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (username: string, password: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authService.login({ username, password });

            localStorage.setItem('auth_token', response.token);

            const userData = {
                user: response.user,
                roles: response.roles,
                permisos: response.permisos
            };
            localStorage.setItem('user_data', JSON.stringify(userData));

            setUser(response.user);
            setRoles(response.roles);
            setPermisos(response.permisos);

            return { success: true };
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRoles([]);
        setPermisos([]);
    };

    const hasPermission = (permisoCodigo: string) => {
        return permisos.some(p => p.codigo === permisoCodigo);
    };

    const hasRole = (rolNombre: string) => {
        return roles.some(r => r.nombre === rolNombre);
    };

    const isAuthenticated = () => {
        return !!localStorage.getItem('auth_token');
    };

    const value = {
        user,
        roles,
        permisos,
        loading,
        error,
        login,
        logout,
        hasPermission,
        hasRole,
        isAuthenticated
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
