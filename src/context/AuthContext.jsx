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
    // 1. Admin hardcodeado para pruebas fáciles
    if (cedula === '1234' && password === '1234') {
      const mockAdmin = {
        username: '1234',
        nombre: 'Administrador Atiempo',
        rol: 'admin',
        mustChangePassword: false
      };
      setUser(mockAdmin);
      localStorage.setItem('pm_user', JSON.stringify(mockAdmin));
      return mockAdmin;
    }

    try {
      // 2. Intentar consultar contra el servidor de AWS
      const userData = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ cedula, password })
      });
      
      setUser(userData);
      localStorage.setItem('pm_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      console.warn("Fallo login de AWS. Intentando buscar en usuarios locales de localStorage.", err);
      
      // 3. Fallback en base de datos local (localStorage)
      const localUsersStr = localStorage.getItem('pm_local_usuarios');
      if (localUsersStr) {
        const localUsers = JSON.parse(localUsersStr);
        const matched = localUsers.find(u => u.username === cedula);
        
        if (matched) {
          const matchedPassword = matched.contrasena || matched.contraseña || '123';
          if (matchedPassword === password) {
            const sessionUser = {
              username: matched.username,
              nombre: matched.nombre,
              rol: matched.rol || 'user',
              // Si la contraseña coincide con la contraseña por defecto '123', forzar cambio
              mustChangePassword: matchedPassword === '123' && matched.mustChangePassword !== false
            };
            setUser(sessionUser);
            localStorage.setItem('pm_user', JSON.stringify(sessionUser));
            return sessionUser;
          }
        }
      }
      
      throw new Error("Cédula o contraseña incorrectas.");
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
