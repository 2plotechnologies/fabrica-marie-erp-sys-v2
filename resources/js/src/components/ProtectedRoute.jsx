import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredPermission, requiredRole }) => {
    const { isAuthenticated, hasPermission, hasRole } = useAuth();

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/dashboard" replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
