import React, { useState } from 'react';
import { X, Eye, EyeOff, Save, ShieldAlert } from 'lucide-react';

export default function EditUserModal({ user, onClose, onSave }) {
  const [nombre, setNombre] = useState(user.nombre || '');
  const [rol, setRol] = useState(user.rol || 'user');
  const [contrasena, setContrasena] = useState(user.contrasena || user.contraseña || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave({
        ...user,
        nombre: nombre.trim(),
        rol,
        contrasena
      });
      onClose();
    } catch (err) {
      setError(err.message || "Error al actualizar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md rounded-2xl border border-gold-500/20 p-6 relative overflow-hidden animate-fade-in">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold gold-gradient-text">Editar Usuario</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-brand-blue-800 transition-all">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Cédula (No editable)</label>
            <input
              type="text"
              disabled
              value={user.username}
              className="w-full bg-brand-blue-950 border border-brand-blue-850 text-gray-400 rounded-xl py-2.5 px-3 text-sm cursor-not-allowed opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="ej. Juan Pérez"
              className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingresa la contraseña"
                className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
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
            <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full bg-brand-blue-900 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value="user">Usuario (Jugador)</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold bg-brand-blue-900 border border-brand-blue-800 text-gray-300 hover:bg-brand-blue-800 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
            >
              <Save size={16} />
              <span>{loading ? "Guardando..." : "Guardar"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
