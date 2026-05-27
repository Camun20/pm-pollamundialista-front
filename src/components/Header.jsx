import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isMockModeEnabled, getApiBaseUrl } from '../services/api';
import ApiConfigModal from './ApiConfigModal';

export default function Header() {
  const { user, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const isMock = isMockModeEnabled();

  return (
    <header className="border-b border-brand-blue-800 bg-brand-blue-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <h1 className="text-2xl font-black tracking-wider gold-gradient-text m-0 p-0 leading-none">
              POLLA MUNDIALISTA
            </h1>
            <p className="text-xs text-brand-blue-600 font-medium mt-1">CATAR & MÉXICO-USA-CANADÁ</p>
          </div>
        </div>

        {/* CONNECTION BAR */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:brightness-110 ${
              isMock 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
            }`}
          >
            <span className={`h-2 w-2 rounded-full animate-pulse ${isMock ? "bg-amber-400" : "bg-emerald-400"}`} />
            {isMock ? "Modo Simulador" : "AWS Conectado"}
            <span className="text-gray-500 text-[10px] ml-1">⚙️ Config</span>
          </button>

          {user && (
            <div className="flex items-center gap-4 border-l border-brand-blue-800 pl-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user.nombre}</p>
                <p className="text-xs font-bold text-gold-500 uppercase tracking-widest">{user.rol}</p>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 active:scale-95 transition-all"
              >
                Salir 🚪
              </button>
            </div>
          )}
        </div>
      </div>
      
      <ApiConfigModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
