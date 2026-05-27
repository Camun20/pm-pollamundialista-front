import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Por favor ingresa usuario y contraseña.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(username.trim().toLowerCase(), password);
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
        await login('admin', 'admin');
      } else {
        await login('carlos_gomez', 'carlos123');
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

        <div className="text-5xl mb-3">⚽🔥</div>
        <h2 className="text-3xl font-extrabold gold-gradient-text tracking-wide mb-1">
          ¡Ingresa a la Polla!
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Pronostica con tus amigos y demuestra quién es el rey del fútbol.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-pulse text-left">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
              Usuario o Alias
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. messi10 o admin"
              className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 transition-all placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
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
            {loading ? "Iniciando Sesión... ⏳" : "Iniciar Sesión 🚀"}
          </button>
        </form>

        {/* Botones de Acceso Rápido para Demostración */}
        <div className="mt-8 pt-6 border-t border-brand-blue-800/80">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
            Acceso rápido para demo:
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-brand-blue-800/60 text-gold-500 border border-gold-500/20 hover:bg-brand-blue-700/80 active:scale-95 transition-all"
            >
              🔑 Entrar como Admin
            </button>
            <button
              onClick={() => handleQuickLogin('user')}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-brand-blue-800/60 text-emerald-400 border border-emerald-500/20 hover:bg-brand-blue-700/80 active:scale-95 transition-all"
            >
              ⚽ Entrar como Usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
