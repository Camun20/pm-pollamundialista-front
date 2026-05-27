import React, { useState } from 'react';
import { getApiBaseUrl, setApiBaseUrl, isMockModeEnabled, setMockMode } from '../services/api';

export default function ApiConfigModal({ isOpen, onClose }) {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [isMock, setIsMock] = useState(isMockModeEnabled());

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    setMockMode(isMock);
    onClose();
    window.location.reload(); // Recarga para resetear estados y reconectar
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card max-w-md w-full rounded-2xl p-6 border border-gold-500/30 text-left">
        <h3 className="text-xl font-bold gold-gradient-text mb-4">Configuración de Conexión</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-blue-600 mb-1">Modo de Operación</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMock(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                  isMock 
                    ? "bg-gold-500/20 text-gold-500 border-gold-500" 
                    : "bg-brand-blue-800 text-gray-400 border-transparent hover:bg-brand-blue-700"
                }`}
              >
                Simulador Local (Mock)
              </button>
              <button
                onClick={() => setIsMock(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                  !isMock 
                    ? "bg-gold-500/20 text-gold-500 border-gold-500" 
                    : "bg-brand-blue-800 text-gray-400 border-transparent hover:bg-brand-blue-700"
                }`}
              >
                Servidor Real
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isMock 
                ? "Usa base de datos simulada localmente para probar de inmediato." 
                : "Se conectará directamente al servidor principal mediante internet."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-blue-600 mb-1">URL Base del Servidor</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              disabled={isMock}
              placeholder="https://..."
              className={`w-full py-2 px-3 rounded-lg border text-sm transition-all focus:outline-none focus:ring-1 ${
                isMock 
                  ? "bg-brand-blue-900/50 text-gray-500 border-gray-800 cursor-not-allowed" 
                  : "bg-brand-blue-900 border-gold-500/20 text-white focus:ring-gold-500 focus:border-gold-500"
              }`}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-brand-blue-800 text-gray-300 hover:bg-brand-blue-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-gold-500/20"
          >
            Guardar y Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
