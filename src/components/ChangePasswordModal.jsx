import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Save, ShieldAlert } from 'lucide-react';

export default function ChangePasswordModal({ user, onSave }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) {
      setError("Por favor completa ambos campos de contraseña.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(password);
    } catch (err) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md rounded-3xl border border-gold-500/25 p-8 relative overflow-hidden animate-fade-in text-center">
        {/* Glow effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500">
            <KeyRound size={32} />
          </div>
        </div>

        <h3 className="text-2xl font-extrabold gold-gradient-text tracking-wide mb-2">¡Cambio de Contraseña Requerido!</h3>
        <p className="text-xs text-gray-400 mb-6">
          Por motivos de seguridad, debes actualizar tu contraseña inicial al iniciar sesión por primera vez.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 text-left">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gold-500 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gold-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
          >
            <Save size={18} />
            <span>{loading ? "Actualizando..." : "Actualizar Contraseña"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
