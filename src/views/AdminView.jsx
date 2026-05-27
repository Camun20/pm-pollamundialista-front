import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState('crear'); // 'crear' o 'pronosticos'
  
  // Estado para Crear Partido
  const [equipo1, setEquipo1] = useState('');
  const [equipo2, setEquipo2] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Estado para Ver Pronósticos
  const [pronosticos, setPronosticos] = useState([]);
  const [loadingPronosticos, setLoadingPronosticos] = useState(false);
  const [pronosticosError, setPronosticosError] = useState(null);

  const fetchPronosticos = async () => {
    setLoadingPronosticos(true);
    setPronosticosError(null);
    try {
      const data = await apiRequest('/pronosticos');
      setPronosticos(data);
    } catch (err) {
      setPronosticosError(err.message || 'Error al cargar los pronósticos.');
    } finally {
      setLoadingPronosticos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pronosticos') {
      fetchPronosticos();
    }
  }, [activeTab]);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!equipo1.trim() || !equipo2.trim() || !fecha || !hora) {
      setCreateError('Todos los campos son requeridos');
      return;
    }

    setLoadingCreate(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      await apiRequest('/partidos', {
        method: 'POST',
        body: JSON.stringify({
          equipo1: equipo1.trim(),
          equipo2: equipo2.trim(),
          fecha,
          hora
        })
      });
      setCreateSuccess(true);
      setEquipo1('');
      setEquipo2('');
      setFecha('');
      setHora('');
      setTimeout(() => setCreateSuccess(false), 4000);
    } catch (err) {
      setCreateError(err.message || 'Error al crear el partido');
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8 animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Panel de Control de Administrador ⚙️</h2>
          <p className="text-sm text-gray-400">Gestiona partidos activos y supervisa todas las apuestas.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-blue-800 mb-8 gap-2">
        <button
          onClick={() => setActiveTab('crear')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'crear'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <span>➕</span> Crear Partido
        </button>
        <button
          onClick={() => setActiveTab('pronosticos')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pronosticos'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <span>📊</span> Ver Pronósticos
        </button>
      </div>

      {/* Content */}
      <div className="glass-card rounded-2xl p-6 border border-gold-500/10 min-h-[300px]">
        {activeTab === 'crear' ? (
          <div className="max-w-xl mx-auto">
            <h3 className="text-xl font-bold gold-gradient-text mb-6">Programar Nuevo Encuentro</h3>
            
            {createSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2 animate-bounce">
                ✅ ¡Partido creado exitosamente en el backend!
              </div>
            )}

            {createError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-2">
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
                    Local (Equipo 1)
                  </label>
                  <input
                    type="text"
                    value={equipo1}
                    onChange={(e) => setEquipo1(e.target.value)}
                    placeholder="ej. Colombia"
                    className="w-full bg-brand-blue-900/60 border border-gold-500/15 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
                    Visitante (Equipo 2)
                  </label>
                  <input
                    type="text"
                    value={equipo2}
                    onChange={(e) => setEquipo2(e.target.value)}
                    placeholder="ej. Brasil"
                    className="w-full bg-brand-blue-900/60 border border-gold-500/15 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
                    Fecha del Partido
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-brand-blue-900/60 border border-gold-500/15 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-1">
                    Hora del Partido
                  </label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-brand-blue-900/60 border border-gold-500/15 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingCreate}
                className="w-full py-4 mt-4 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
              >
                {loadingCreate ? "Guardando partido... ⌛" : "Crear y Guardar Partido 💾"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold gold-gradient-text">Tabla de Pronósticos Registrados</h3>
              <button 
                onClick={fetchPronosticos} 
                className="p-2 bg-brand-blue-800 hover:bg-brand-blue-700 active:scale-95 text-gray-300 rounded-lg text-xs font-bold transition-all"
              >
                🔄 Actualizar
              </button>
            </div>

            {loadingPronosticos ? (
              <div className="py-12 text-center text-gray-400">
                <span className="inline-block animate-spin text-xl mr-2">⚽</span> Cargando pronósticos de la API...
              </div>
            ) : pronosticosError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                {pronosticosError}
              </div>
            ) : pronosticos.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                Aún no hay ningún pronóstico registrado por los usuarios.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-brand-blue-800 text-brand-blue-600 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Partido</th>
                      <th className="py-3 px-4 text-center">Marcador Pronosticado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pronosticos.map((pronostico) => (
                      <tr 
                        key={pronostico.id} 
                        className="border-b border-brand-blue-800/40 hover:bg-brand-blue-800/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-white">
                          👤 {pronostico.usuario}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          ⚔️ {pronostico.equipo1} vs {pronostico.equipo2}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-2 bg-gold-500/10 text-gold-500 font-extrabold px-3 py-1 rounded-full text-sm border border-gold-500/20">
                            {pronostico.golesLocal} - {pronostico.golesVisitante}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
