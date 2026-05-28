import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('pm_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('pm_user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Inicio de sesión con cédula (número) y contraseña.
   * @param {string} cedula - Número de cédula del usuario
   * @param {string} password - Contraseña
   */
  const login = async (cedula, password) => {
    try {
      const userData = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ cedula, password })
      });
      
      setUser(userData);
      localStorage.setItem('pm_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw new Error(err.message || "Cédula o contraseña incorrectas.");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pm_user');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('pm_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
