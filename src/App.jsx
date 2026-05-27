import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import UserView from './views/UserView';

function MainAppContent() {
  const { user, loading } = useAuth();

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
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow py-8">
        {!user ? (
          <LoginView />
        ) : user.rol === 'admin' ? (
          <AdminView />
        ) : (
          <UserView />
        )}
      </main>

      <footer className="border-t border-brand-blue-800 bg-brand-blue-900/20 py-6 text-center text-xs text-gray-500">
        <p>🏆 Polla Mundialista v1.0.0 © 2026 - Conexión Serverless AWS Activa ⚡</p>
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
