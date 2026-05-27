import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { getCountryFlagUrl } from '../utils/flags';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState('partidos'); // 'partidos', 'pronosticos', 'usuarios'
  
  // --- ESTADOS DE PARTIDOS ---
  const [partidos, setPartidos] = useState([]);
  const [equipo1, setEquipo1] = useState('');
  const [equipo2, setEquipo2] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [loadingPartidos, setLoadingPartidos] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState(null);
  
  // Registro de marcadores reales por partidoId
  // { [partidoId]: { local: '', visitante: '' } }
  const [realScores, setRealScores] = useState({});
  const [savingScoreId, setSavingScoreId] = useState(null);

  // --- ESTADOS DE PRONÓSTICOS ---
  const [pronosticos, setPronosticos] = useState([]);
  const [loadingPronosticos, setLoadingPronosticos] = useState(false);
  const [pronosticosError, setPronosticosError] = useState(null);

  // --- ESTADOS DE USUARIOS ---
  const [usuarios, setUsuarios] = useState([]);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserNombre, setNewUserNombre] = useState('');
  const [newUserRol, setNewUserRol] = useState('user');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuariosError, setUsuariosError] = useState(null);
  const [usuariosSuccess, setUsuariosSuccess] = useState(false);

  // Carga inicial y recarga
  const loadPartidos = async () => {
    setLoadingPartidos(true);
    try {
      const data = await apiRequest('/partidos');
      setPartidos(data);
      
      // Inicializar inputs de marcador real
      const scores = {};
      data.forEach(p => {
        scores[p.id] = {
          local: p.golesRealLocal !== null ? p.golesRealLocal.toString() : '',
          visitante: p.golesRealVisitante !== null ? p.golesRealVisitante.toString() : ''
        };
      });
      setRealScores(scores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPartidos(false);
    }
  };

  const loadPronosticos = async () => {
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

  const loadUsuarios = async () => {
    setLoadingUsuarios(true);
    setUsuariosError(null);
    try {
      const data = await apiRequest('/usuarios');
      setUsuarios(data);
    } catch (err) {
      setUsuariosError(err.message || 'Error al cargar usuarios.');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  useEffect(() => {
    loadPartidos();
  }, []);

  useEffect(() => {
    if (activeTab === 'pronosticos') {
      loadPronosticos();
    } else if (activeTab === 'usuarios') {
      loadUsuarios();
    } else if (activeTab === 'partidos') {
      loadPartidos();
      loadPronosticos(); // Cargar también pronósticos para ver ganadores en vivo
    }
  }, [activeTab]);

  // Crear Partido
  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!equipo1.trim() || !equipo2.trim() || !fecha || !hora) {
      setCreateError('Todos los campos son requeridos');
      return;
    }

    setLoadingPartidos(true);
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
      loadPartidos();
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err) {
      setCreateError(err.message || 'Error al crear el partido');
    } finally {
      setLoadingPartidos(false);
    }
  };

  // Guardar Marcador Real
  const handleSaveRealScore = async (partidoId) => {
    const scores = realScores[partidoId];
    if (!scores) return;

    setSavingScoreId(partidoId);
    try {
      const golesLocal = scores.local === '' ? null : parseInt(scores.local);
      const golesVisitante = scores.visitante === '' ? null : parseInt(scores.visitante);

      await apiRequest('/partidos/resultado', {
        method: 'POST',
        body: JSON.stringify({
          partidoId,
          golesRealLocal: golesLocal,
          golesRealVisitante: golesVisitante
        })
      });

      // Recargar partidos y pronósticos
      await Promise.all([loadPartidos(), loadPronosticos()]);
    } catch (err) {
      alert(err.message || "Error al actualizar resultado real");
    } finally {
      setSavingScoreId(null);
    }
  };

  // Crear Usuario
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserUsername.trim() || !newUserNombre.trim()) {
      setUsuariosError('Nombre y usuario son obligatorios');
      return;
    }

    setLoadingUsuarios(true);
    setUsuariosError(null);
    setUsuariosSuccess(false);

    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          username: newUserUsername.trim(),
          nombre: newUserNombre.trim(),
          rol: newUserRol,
          contrasena: newUserPassword
        })
      });

      setUsuariosSuccess(true);
      setNewUserUsername('');
      setNewUserNombre('');
      setNewUserPassword('123');
      setNewUserRol('user');
      loadUsuarios();
      setTimeout(() => setUsuariosSuccess(false), 3000);
    } catch (err) {
      setUsuariosError(err.message || 'Error al crear usuario');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Eliminar Usuario
  const handleDeleteUser = async (username) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario @${username}?`)) return;

    setLoadingUsuarios(true);
    try {
      await apiRequest(`/usuarios/${username}`, {
        method: 'DELETE'
      });
      loadUsuarios();
    } catch (err) {
      setUsuariosError(err.message || 'Error al eliminar usuario');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Renderizar bandera o elemento visual del país
  const renderFlag = (teamName) => {
    const flagUrl = getCountryFlagUrl(teamName);
    if (flagUrl) {
      return <img src={flagUrl} alt={teamName} className="h-6 w-9 object-cover rounded shadow-sm inline-block mr-2" />;
    }
    return <span className="inline-block mr-2 text-sm">⚽</span>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mt-8 animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Panel de Control General ⚙️</h2>
          <p className="text-sm text-gray-400">Gestiona partidos, resultados, pronósticos y usuarios del sistema.</p>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-brand-blue-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('partidos')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'partidos'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <span>🏆</span> Partidos y Resultados
        </button>
        <button
          onClick={() => setActiveTab('pronosticos')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pronosticos'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <span>📊</span> Pronósticos Totales
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'usuarios'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <span>👤</span> Gestionar Usuarios
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      
      {/* 1. PESTAÑA: PARTIDOS Y RESULTADOS */}
      {activeTab === 'partidos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Crear Partido */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 self-start lg:col-span-1">
            <h3 className="text-lg font-bold gold-gradient-text mb-4">Crear Partido</h3>
            
            {createSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ¡Partido programado exitosamente!
              </div>
            )}
            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Local (Equipo 1)</label>
                <input
                  type="text"
                  value={equipo1}
                  onChange={(e) => setEquipo1(e.target.value)}
                  placeholder="ej. Colombia"
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Visitante (Equipo 2)</label>
                <input
                  type="text"
                  value={equipo2}
                  onChange={(e) => setEquipo2(e.target.value)}
                  placeholder="ej. Brasil"
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Hora</label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 transition-all text-sm"
              >
                Crear Encuentro ⚽
              </button>
            </form>
          </div>

          {/* Listado de Partidos */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold gold-gradient-text">Partidos Programados</h3>
              <button onClick={loadPartidos} className="text-xs text-gray-400 hover:text-white transition-colors">
                🔄 Recargar
              </button>
            </div>

            {loadingPartidos ? (
              <div className="py-12 text-center text-gray-500">Cargando encuentros...</div>
            ) : partidos.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No se han registrado partidos.</div>
            ) : (
              <div className="space-y-4">
                {partidos.map((partido) => {
                  const score = realScores[partido.id] || { local: '', visitante: '' };
                  const partidoPronosticos = pronosticos.filter(p => p.partidoId === partido.id);
                  
                  // Identificar ganadores si el marcador real existe
                  const tieneMarcadorReal = partido.golesRealLocal !== null && partido.golesRealVisitante !== null;
                  const ganadores = tieneMarcadorReal 
                    ? partidoPronosticos.filter(p => p.golesLocal === partido.golesRealLocal && p.golesVisitante === partido.golesRealVisitante)
                    : [];

                  return (
                    <div 
                      key={partido.id} 
                      className="border border-brand-blue-800 rounded-xl p-4 bg-brand-blue-900/10 hover:bg-brand-blue-950/20 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="text-xs text-gray-400">
                          <span>📅 {partido.fecha}</span> • <span>⏰ {partido.hora}</span>
                        </div>
                        
                        {/* Marcador Real */}
                        <div className="flex items-center gap-2 bg-brand-blue-900/60 p-2 rounded-lg border border-gold-500/10">
                          <span className="text-xs font-bold text-brand-blue-600 uppercase">Resultado Real:</span>
                          <input
                            type="text"
                            value={score.local}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (/^\d+$/.test(val) && parseInt(val) <= 20)) {
                                setRealScores(prev => ({
                                  ...prev,
                                  [partido.id]: { ...prev[partido.id], local: val }
                                }));
                              }
                            }}
                            placeholder="Local"
                            className="w-10 bg-brand-blue-950 text-white rounded text-center py-0.5 text-xs font-bold border border-brand-blue-800"
                          />
                          <span className="text-white text-xs font-bold">-</span>
                          <input
                            type="text"
                            value={score.visitante}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (/^\d+$/.test(val) && parseInt(val) <= 20)) {
                                setRealScores(prev => ({
                                  ...prev,
                                  [partido.id]: { ...prev[partido.id], visitante: val }
                                }));
                              }
                            }}
                            placeholder="Visita"
                            className="w-10 bg-brand-blue-950 text-white rounded text-center py-0.5 text-xs font-bold border border-brand-blue-800"
                          />
                          <button
                            onClick={() => handleSaveRealScore(partido.id)}
                            disabled={savingScoreId === partido.id}
                            className="px-2 py-1 rounded bg-gold-500 text-black font-extrabold text-[10px] uppercase hover:brightness-110 active:scale-95 transition-all"
                          >
                            {savingScoreId === partido.id ? "..." : "Guardar"}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-y border-brand-blue-900/40">
                        {/* Equipo 1 */}
                        <div className="flex items-center flex-1 justify-end font-bold text-white">
                          <span className="mr-2 hidden sm:inline">{partido.equipo1}</span>
                          {renderFlag(partido.equipo1)}
                        </div>
                        
                        {/* VS */}
                        <div className="px-4 font-bold text-gold-500 text-xs">VS</div>

                        {/* Equipo 2 */}
                        <div className="flex items-center flex-1 justify-start font-bold text-white">
                          {renderFlag(partido.equipo2)}
                          <span className="ml-2 hidden sm:inline">{partido.equipo2}</span>
                        </div>
                      </div>

                      {/* Lista de Pronósticos para este partido */}
                      <div className="text-xs space-y-2">
                        <p className="font-bold text-brand-blue-600 uppercase tracking-wider">
                          Pronósticos de los participantes ({partidoPronosticos.length}):
                        </p>
                        {partidoPronosticos.length === 0 ? (
                          <p className="text-gray-500 italic">Nadie ha apostado aún en este encuentro.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2">
                            {partidoPronosticos.map((p) => {
                              const esGanador = tieneMarcadorReal && p.golesLocal === partido.golesRealLocal && p.golesVisitante === partido.golesRealVisitante;
                              return (
                                <div 
                                  key={p.id} 
                                  className={`flex justify-between items-center p-2 rounded-lg border ${
                                    esGanador 
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold" 
                                      : "bg-brand-blue-950/40 border-brand-blue-900/60 text-gray-300"
                                  }`}
                                >
                                  <span>👤 {p.usuario}</span>
                                  <span className="bg-brand-blue-900 px-2 py-0.5 rounded font-bold">
                                    {p.golesLocal} - {p.golesVisitante} {esGanador && "👑 GANADOR"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Mostrar lista de ganadores consolidados */}
                        {tieneMarcadorReal && (
                          <div className="pt-2 border-t border-brand-blue-900 text-xs">
                            <span className="font-bold text-gold-500">Ganadores de este partido: </span>
                            {ganadores.length === 0 ? (
                              <span className="text-gray-400">Nadie acertó el marcador exacto ({partido.golesRealLocal} - {partido.golesRealVisitante}).</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">
                                {ganadores.map(g => `@${g.usuario}`).join(', ')} (Premio dividido entre {ganadores.length})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PESTAÑA: PRONÓSTICOS GENERALES */}
      {activeTab === 'pronosticos' && (
        <div className="glass-card rounded-2xl p-6 border border-gold-500/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold gold-gradient-text">Tabla General de Apuestas</h3>
            <button onClick={loadPronosticos} className="text-xs text-gray-400 hover:text-white">
              🔄 Actualizar
            </button>
          </div>

          {loadingPronosticos ? (
            <div className="py-12 text-center text-gray-500">Cargando pronósticos...</div>
          ) : pronosticosError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border text-rose-300">{pronosticosError}</div>
          ) : pronosticos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Aún no hay apuestas registradas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-brand-blue-800 text-brand-blue-600 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Partido</th>
                    <th className="py-3 px-4 text-center">Marcador Exacto</th>
                  </tr>
                </thead>
                <tbody>
                  {pronosticos.map((p) => (
                    <tr key={p.id} className="border-b border-brand-blue-800/40 hover:bg-brand-blue-800/10">
                      <td className="py-3 px-4 text-white font-bold">👤 {p.usuario}</td>
                      <td className="py-3 px-4 text-gray-300">
                        {renderFlag(p.equipo1)} {p.equipo1} vs {p.equipo2} {renderFlag(p.equipo2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-gold-500/10 text-gold-500 border border-gold-500/20 font-extrabold px-3 py-1 rounded-full text-xs">
                          {p.golesLocal} - {p.golesVisitante}
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

      {/* 3. PESTAÑA: GESTIONAR USUARIOS */}
      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Crear Usuario */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 self-start lg:col-span-1">
            <h3 className="text-lg font-bold gold-gradient-text mb-4">Agregar Nuevo Usuario</h3>
            
            {usuariosSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ¡Usuario registrado correctamente!
              </div>
            )}
            {usuariosError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {usuariosError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newUserNombre}
                  onChange={(e) => setNewUserNombre(e.target.value)}
                  placeholder="ej. Juan Pérez"
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Usuario / Alias</label>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="ej. juanp10"
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Contraseña Inicial</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Rol</label>
                <select
                  value={newUserRol}
                  onChange={(e) => setNewUserRol(e.target.value)}
                  className="w-full bg-brand-blue-900 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                >
                  <option value="user">Usuario (Jugador)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 transition-all text-sm"
              >
                Crear Usuario 👤
              </button>
            </form>
          </div>

          {/* Listado de Usuarios */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 lg:col-span-2">
            <h3 className="text-lg font-bold gold-gradient-text mb-6">Usuarios del Sistema</h3>

            {loadingUsuarios ? (
              <div className="py-12 text-center text-gray-500">Cargando lista de usuarios...</div>
            ) : usuarios.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No hay usuarios registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-brand-blue-800 text-brand-blue-600 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Nombre</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.username} className="border-b border-brand-blue-800/40 hover:bg-brand-blue-800/10">
                        <td className="py-3 px-4 text-white font-bold">{u.nombre}</td>
                        <td className="py-3 px-4 text-gray-400">@{u.username}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            u.role === 'admin' || u.rol === 'admin'
                              ? 'bg-gold-500/10 text-gold-500 border-gold-500/20'
                              : 'bg-brand-blue-800/40 text-brand-blue-500 border-brand-blue-800/60'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.username)}
                            disabled={u.username === 'admin'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              u.username === 'admin'
                                ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500 border-transparent'
                                : 'bg-rose-500/15 border-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            }`}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
