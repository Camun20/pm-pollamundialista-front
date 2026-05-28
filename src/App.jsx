import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import UserView from './views/UserView';
import ErrorBoundary from './components/ErrorBoundary';
import ChangePasswordModal from './components/ChangePasswordModal';

function MainAppContent() {
  const { user, loading, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState('partidos');

  // Sincronizar la sección por defecto según el rol al iniciar sesión
  useEffect(() => {
    if (user) {
      const initialSection = user.rol === 'admin' ? 'partidos' : 'mis-pronosticos';
      setActiveSection(initialSection);
    }
  }, [user?.username, user?.rol]);

  // Control de protección de rutas y redirección al login
  useEffect(() => {
    const handleRouteGuard = () => {
      const hash = window.location.hash.replace('#/', '');
      
      if (!user) {
        if (window.location.hash !== '') {
          window.location.hash = ''; // Redirige al login
        }
      } else if (hash) {
        const validAdminSections = ['partidos', 'fase-grupos', 'fase-16', 'fase-8', 'fase-4', 'fase-2', 'fase-1', 'pronosticos', 'usuarios', 'puntuacion'];
        const validUserSections = ['mis-pronosticos', 'fase-grupos', 'fase-16', 'fase-8', 'fase-4', 'fase-2', 'fase-1', 'puntuacion'];
        const isValid = user.rol === 'admin' 
          ? validAdminSections.includes(hash) 
          : validUserSections.includes(hash);
          
        if (isValid) {
          setActiveSection(hash);
        } else {
          window.location.hash = `/${activeSection}`;
        }
      }
    };

    window.addEventListener('hashchange', handleRouteGuard);
    handleRouteGuard();

    return () => window.removeEventListener('hashchange', handleRouteGuard);
  }, [user, activeSection]);

  // Sincronizar el Hash cuando cambia la sección activa
  useEffect(() => {
    if (user) {
      window.location.hash = `/${activeSection}`;
    } else {
      window.location.hash = '';
    }
  }, [activeSection, user]);

  const handleChangePassword = async (newPassword) => {
    // 1. Guardar localmente en pm_local_usuarios para que quede persistente
    const localUsersStr = localStorage.getItem('pm_local_usuarios');
    if (localUsersStr) {
      const localUsers = JSON.parse(localUsersStr);
      const updated = localUsers.map(u => {
        if (u.username === user.username) {
          return { ...u, contrasena: newPassword, mustChangePassword: false };
        }
        return u;
      });
      localStorage.setItem('pm_local_usuarios', JSON.stringify(updated));
    }

    // 2. Intentar actualizar contraseña en AWS
    try {
      await apiRequest('/usuarios/password', {
        method: 'POST',
        body: JSON.stringify({ username: user.username, contrasena: newPassword })
      });
    } catch (e) {
      console.warn("No se pudo persistir el cambio de contraseña en AWS (Lambda mock), pero ya quedó actualizado localmente.");
    }

    // 3. Quitar flag de mustChangePassword del usuario logueado en la sesión
    updateUser({
      ...user,
      mustChangePassword: false
    });

    // Redirigir de inmediato a la sección de Mis Pronósticos
    setActiveSection('mis-pronosticos');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b0f19] text-gray-400">
        <div className="text-center">
          <span className="inline-block animate-spin text-4xl mb-4">⚽</span>
          <p className="text-lg font-bold">Cargando Polla Mundialista...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans relative">
      {user && (
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      )}
      
      {/* Container con padding lateral adaptativo en desktop para sidebar */}
      <div className={`flex flex-col flex-grow transition-all duration-300 ${user ? 'lg:pl-72' : ''}`}>
        <Header />
        
        <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
          {!user ? (
            <LoginView />
          ) : user.rol === 'admin' ? (
            <ErrorBoundary>
              <AdminView activeSection={activeSection} onSectionChange={setActiveSection} />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary>
              <UserView activeSection={activeSection} />
            </ErrorBoundary>
          )}
        </main>

        {user && (
          <footer className="border-t border-brand-blue-800 bg-brand-blue-900/20 py-4 text-center text-xs text-gray-500">
            <p>Polla Mundialista Atiempo v1.0.0 © 2026</p>
          </footer>
        )}

      </div>

      {/* Modal de cambio de contraseña al primer login */}
      {user && user.mustChangePassword && (
        <ChangePasswordModal user={user} onSave={handleChangePassword} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
