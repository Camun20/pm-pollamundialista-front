import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { getCountryFlagUrl } from '../utils/flags';
import CountrySelector from '../components/CountrySelector';
import { 
  Calendar, 
  BarChart3, 
  Users, 
  RefreshCw, 
  Save, 
  Trash2, 
  Plus, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  AlertCircle
} from 'lucide-react';

export default function AdminView({ activeSection, onSectionChange }) {
  const activeTab = activeSection || 'partidos';
  const setActiveTab = onSectionChange || (() => {});
  
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
  const [newUserCedula, setNewUserCedula] = useState('');
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
      const partidosList = Array.isArray(data) ? data : [];
      setPartidos(partidosList);
      
      // Inicializar inputs de marcador real
      const scores = {};
      partidosList.forEach(p => {
        scores[p.id] = {
          local: p.golesRealLocal !== null ? p.golesRealLocal.toString() : '',
          visitante: p.golesRealVisitante !== null ? p.golesRealVisitante.toString() : ''
        };
      });
      setRealScores(scores);
    } catch (err) {
      console.error(err);
      setPartidos([]);
    } finally {
      setLoadingPartidos(false);
    }
  };

  const loadPronosticos = async () => {
    setLoadingPronosticos(true);
    setPronosticosError(null);
    try {
      const data = await apiRequest('/pronosticos');
      setPronosticos(Array.isArray(data) ? data : []);
    } catch (err) {
      setPronosticosError(err.message || 'Error al cargar los pronósticos.');
      setPronosticos([]);
    } finally {
      setLoadingPronosticos(false);
    }
  };

  const getLocalUsuarios = () => {
    const local = localStorage.getItem('pm_local_usuarios');
    if (local) {
      try { return JSON.parse(local); } catch { }
    }
    const defaultUsers = [
      { username: '1234', nombre: 'Administrador Atiempo', rol: 'admin' },
      { username: '123456789', nombre: 'Juan Pérez (Demo)', rol: 'user' }
    ];
    localStorage.setItem('pm_local_usuarios', JSON.stringify(defaultUsers));
    return defaultUsers;
  };

  const loadUsuarios = async () => {
    setLoadingUsuarios(true);
    setUsuariosError(null);
    try {
      const data = await apiRequest('/usuarios');
      const list = Array.isArray(data) ? data : [];
      setUsuarios(list);
      if (list.length > 0) {
        localStorage.setItem('pm_local_usuarios', JSON.stringify(list));
      }
    } catch (err) {
      console.warn("Fallo al conectar con AWS para /usuarios. Usando almacenamiento local fallback.", err);
      const localList = getLocalUsuarios();
      setUsuarios(localList);
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
      loadPartidos();
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
    if (!equipo1 || !equipo2 || !fecha || !hora) {
      setCreateError('Todos los campos son requeridos, incluyendo los equipos.');
      return;
    }
    if (equipo1 === equipo2) {
      setCreateError('El equipo local y el visitante no pueden ser el mismo.');
      return;
    }

    setLoadingPartidos(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      await apiRequest('/partidos', {
        method: 'POST',
        body: JSON.stringify({
          equipo1: equipo1,
          equipo2: equipo2,
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
    if (!newUserCedula.trim() || !newUserNombre.trim()) {
      setUsuariosError('La cédula y el nombre son obligatorios');
      return;
    }

    setLoadingUsuarios(true);
    setUsuariosError(null);
    setUsuariosSuccess(false);

    const newUserObj = {
      username: newUserCedula.trim(),
      nombre: newUserNombre.trim(),
      rol: newUserRol,
      contrasena: newUserPassword
    };

    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify(newUserObj)
      });

      setUsuariosSuccess(true);
      setNewUserCedula('');
      setNewUserNombre('');
      setNewUserPassword('123');
      setNewUserRol('user');
      loadUsuarios();
      setTimeout(() => setUsuariosSuccess(false), 3000);
    } catch (err) {
      console.warn("Fallo al crear usuario en AWS. Intentando guardar localmente.", err);
      try {
        const localList = getLocalUsuarios();
        if (localList.some(u => u.username === newUserObj.username)) {
          throw new Error("Ya existe un usuario registrado con esa cédula.");
        }
        const updatedList = [...localList, newUserObj];
        localStorage.setItem('pm_local_usuarios', JSON.stringify(updatedList));
        setUsuarios(updatedList);
        setUsuariosSuccess(true);
        setNewUserCedula('');
        setNewUserNombre('');
        setNewUserPassword('123');
        setNewUserRol('user');
        setTimeout(() => setUsuariosSuccess(false), 3000);
      } catch (localErr) {
        setUsuariosError(localErr.message || 'Error al crear usuario localmente');
      }
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Eliminar Usuario
  const handleDeleteUser = async (username) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario con cédula ${username}?`)) return;

    setLoadingUsuarios(true);
    try {
      await apiRequest(`/usuarios/${username}`, {
        method: 'DELETE'
      });
      loadUsuarios();
    } catch (err) {
      console.warn("Fallo al eliminar usuario en AWS. Intentando borrar localmente.", err);
      try {
        const localList = getLocalUsuarios();
        const updatedList = localList.filter(u => u.username !== username);
        localStorage.setItem('pm_local_usuarios', JSON.stringify(updatedList));
        setUsuarios(updatedList);
      } catch (localErr) {
        setUsuariosError(localErr.message || 'Error al eliminar usuario localmente');
      }
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleCedulaInputChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setNewUserCedula(val);
    }
  };

  // Renderizar bandera del país
  const renderFlag = (teamName) => {
    const flagUrl = getCountryFlagUrl(teamName);
    if (flagUrl) {
      return <img src={flagUrl} alt={teamName} className="h-6 w-6 rounded-full object-cover aspect-square shadow-sm inline-block mr-2" />;
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mt-8 animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Panel de Control General</h2>
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
          <Calendar size={16} />
          <span>Partidos y Resultados</span>
        </button>
        <button
          onClick={() => setActiveTab('pronosticos')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pronosticos'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <BarChart3 size={16} />
          <span>Pronósticos por Partido</span>
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'usuarios'
              ? 'border-gold-500 text-gold-500 bg-gold-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-brand-blue-900/40'
          }`}
        >
          <Users size={16} />
          <span>Gestionar Usuarios</span>
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
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={14} />
                <span>¡Partido programado exitosamente!</span>
              </div>
            )}
            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <CountrySelector 
                label="Local (Equipo 1)"
                value={equipo1}
                onChange={setEquipo1}
                placeholder="Selecciona equipo local"
              />

              <CountrySelector 
                label="Visitante (Equipo 2)"
                value={equipo2}
                onChange={setEquipo2}
                placeholder="Selecciona equipo visitante"
              />

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
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Hora (Colombia)</label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
              >
                <Plus size={16} />
                <span>Crear Encuentro</span>
              </button>
            </form>
          </div>

          {/* Listado de Partidos */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold gold-gradient-text">Partidos Programados</h3>
              <button 
                onClick={loadPartidos} 
                className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingPartidos ? (
              <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-gold-500" />
                <span>Cargando encuentros...</span>
              </div>
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
                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                          <Clock size={12} className="text-brand-blue-600" />
                          <span>{partido.fecha}</span> • <span>{partido.hora}</span>
                        </div>
                        
                        {/* Marcador Real */}
                        <div className="flex items-center gap-2 bg-brand-blue-900/60 p-2 rounded-lg border border-gold-500/10">
                          <span className="text-[10px] font-bold text-brand-blue-600 uppercase tracking-wider">Marcador Real:</span>
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
                            placeholder="0"
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
                            placeholder="0"
                            className="w-10 bg-brand-blue-950 text-white rounded text-center py-0.5 text-xs font-bold border border-brand-blue-800"
                          />
                          <button
                            onClick={() => handleSaveRealScore(partido.id)}
                            disabled={savingScoreId === partido.id}
                            className="p-1.5 rounded bg-gold-500 text-black hover:brightness-110 active:scale-95 transition-all"
                            title="Guardar marcador real"
                          >
                            <Save size={12} />
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
                                  <span>{p.nombre || p.usuario}</span>
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
                                {ganadores.map(g => g.nombre || g.usuario).join(', ')} (Premio dividido entre {ganadores.length})
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

      {/* 2. PESTAÑA: PRONÓSTICOS POR PARTIDO */}
      {activeTab === 'pronosticos' && (
        <div className="glass-card rounded-2xl p-6 border border-gold-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold gold-gradient-text">Tabla General de Apuestas por Partido</h3>
              <p className="text-xs text-gray-400 mt-1">Selecciona un partido para ver las apuestas de todos los jugadores.</p>
            </div>
            <button 
              onClick={() => { loadPronosticos(); loadPartidos(); }} 
              className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loadingPronosticos ? (
            <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-gold-500" />
              <span>Cargando apuestas...</span>
            </div>
          ) : partidos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay partidos creados aún.</div>
          ) : (
            <div className="space-y-8">
              {partidos.map((partido) => {
                const partidoPronosticos = pronosticos.filter(p => p.partidoId === partido.id);
                const tieneMarcadorReal = partido.golesRealLocal !== null && partido.golesRealVisitante !== null;

                return (
                  <div key={partido.id} className="border border-brand-blue-800 rounded-xl p-4 bg-brand-blue-900/10 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-brand-blue-800/60 pb-3">
                      <div className="flex items-center gap-2 text-white font-bold">
                        {renderFlag(partido.equipo1)}
                        <span>{partido.equipo1}</span>
                        <span className="text-gold-500 text-xs">VS</span>
                        {renderFlag(partido.equipo2)}
                        <span>{partido.equipo2}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        <span>{partido.fecha}</span> • <span>{partido.hora}</span>
                        {tieneMarcadorReal && (
                          <span className="ml-2 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                            Marcador Real: {partido.golesRealLocal} - {partido.golesRealVisitante}
                          </span>
                        )}
                      </div>
                    </div>

                    {partidoPronosticos.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">Ningún participante ha registrado pronóstico para este encuentro.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-brand-blue-800/40 text-brand-blue-600 font-bold uppercase tracking-wider">
                              <th className="py-2 px-3">Cédula</th>
                              <th className="py-2 px-3">Nombre</th>
                              <th className="py-2 px-3 text-center">Pronóstico</th>
                              <th className="py-2 px-3 text-right">Resultado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partidoPronosticos.map((p) => {
                              const esGanador = tieneMarcadorReal && p.golesLocal === partido.golesRealLocal && p.golesVisitante === partido.golesRealVisitante;
                              return (
                                <tr key={p.id} className="border-b border-brand-blue-800/20 hover:bg-brand-blue-800/10">
                                  <td className="py-2 px-3 text-gray-400">@{p.usuario}</td>
                                  <td className="py-2 px-3 text-white font-semibold">{p.nombre || 'Participante'}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded font-extrabold border ${
                                      esGanador 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-gold-500/5 text-gold-500 border-gold-500/15'
                                    }`}>
                                      {p.golesLocal} - {p.golesVisitante}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {tieneMarcadorReal ? (
                                      esGanador ? (
                                        <span className="text-emerald-400 font-bold">🏆 Ganador</span>
                                      ) : (
                                        <span className="text-gray-500">No acertó</span>
                                      )
                                    ) : (
                                      <span className="text-gray-400">Pendiente</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
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
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={14} />
                <span>¡Usuario registrado correctamente!</span>
              </div>
            )}
            {usuariosError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{usuariosError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Cédula (Solo Números)</label>
                <input
                  type="text"
                  value={newUserCedula}
                  onChange={handleCedulaInputChange}
                  placeholder="ej. 123456789"
                  className="w-full bg-brand-blue-900/60 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
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
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
              >
                <UserPlus size={16} />
                <span>Crear Usuario</span>
              </button>
            </form>
          </div>

          {/* Listado de Usuarios */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold gold-gradient-text">Usuarios del Sistema</h3>
              <button 
                onClick={loadUsuarios} 
                className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingUsuarios ? (
              <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-gold-500" />
                <span>Cargando lista de usuarios...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No hay usuarios registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-brand-blue-800 text-brand-blue-600 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Cédula</th>
                      <th className="py-3 px-4">Nombre</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.username} className="border-b border-brand-blue-800/40 hover:bg-brand-blue-800/10">
                        <td className="py-3 px-4 text-gray-400 font-semibold">@{u.username}</td>
                        <td className="py-3 px-4 text-white font-bold">{u.nombre}</td>
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
                            disabled={u.username === '1000000000'}
                            className={`p-2 rounded-lg border transition-all ${
                              u.username === '1000000000'
                                ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500 border-transparent'
                                : 'bg-rose-500/15 border-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            }`}
                            title="Eliminar usuario"
                          >
                            <Trash2 size={14} />
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
