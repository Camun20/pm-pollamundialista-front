import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, KeyRound, User, AlertCircle } from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCedulaChange = (e) => {
    const val = e.target.value;
    // Permitir solo números
    if (val === '' || /^\d+$/.test(val)) {
      setCedula(val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cedula.trim() || !password.trim()) {
      setError("Por favor ingresa tu número de cédula y contraseña.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(cedula.trim(), password);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  // Helper para pruebas rápidas
  const handleQuickLogin = async (role) => {
    setError(null);
    setLoading(true);
    try {
      if (role === 'admin') {
        await login('1234', '1234');
      } else {
        await login('123456789', '123');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-16 px-4 animate-fade-in">
      <div className="glass-card rounded-3xl p-8 border border-gold-500/20 text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-blue-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500">
            <Trophy size={32} />
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold gold-gradient-text tracking-wide mb-1">
          ¡Ingresa a la Polla!
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Pronostica con tus amigos y demuestra quién es el rey del fútbol.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-pulse text-left flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1 flex items-center gap-1.5">
              <User size={12} />
              Cédula de Ciudadanía
            </label>
            <input
              type="text"
              value={cedula}
              onChange={handleCedulaChange}
              placeholder="Escribe tu número de cédula"
              className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 transition-all placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1 flex items-center gap-1.5">
              <KeyRound size={12} />
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 transition-all placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
          >
            {loading ? "Iniciando Sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Botones de Acceso Rápido para Demostración */}
        <div className="mt-8 pt-6 border-t border-brand-blue-800/80">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
            Acceso rápido:
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-brand-blue-800/60 text-gold-500 border border-gold-500/20 hover:bg-brand-blue-700/80 active:scale-95 transition-all"
            >
              Admin Demo
            </button>
            <button
              onClick={() => handleQuickLogin('user')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-brand-blue-800/60 text-emerald-400 border border-emerald-500/20 hover:bg-brand-blue-700/80 active:scale-95 transition-all"
            >
              Jugador Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
