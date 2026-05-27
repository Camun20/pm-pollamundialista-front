import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import UserView from './views/UserView';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('partidos');

  // Control de protección de rutas y redirección al login
  useEffect(() => {
    const handleRouteGuard = () => {
      const hash = window.location.hash.replace('#/', '');
      
      if (!user) {
        if (window.location.hash !== '') {
          window.location.hash = ''; // Redirige al login
        }
      } else if (hash) {
        const validAdminSections = ['partidos', 'pronosticos', 'usuarios'];
        const validUserSections = ['mis-pronosticos', 'partidos'];
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
      
      <Header />
      
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        {!user ? (
          <LoginView />
        ) : user.rol === 'admin' ? (
          <AdminView activeSection={activeSection} onSectionChange={setActiveSection} />
        ) : (
          <UserView activeSection={activeSection} />
        )}
      </main>

      <footer className="border-t border-brand-blue-800 bg-brand-blue-900/20 py-6 text-center text-xs text-gray-500">
        <p>Polla Mundialista Atiempo v1.0.0 © 2026 - Conexión Serverless AWS Activa</p>
      </footer>
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
