import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { getCountryFlagUrl } from '../utils/flags';
import CountrySelector from '../components/CountrySelector';
import EditUserModal from '../components/EditUserModal';
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
  AlertCircle,
  Eye,
  EyeOff,
  Pencil
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
  const [showPassword, setShowPassword] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuariosError, setUsuariosError] = useState(null);
  const [usuariosSuccess, setUsuariosSuccess] = useState(false);

  // --- EDICIÓN DE USUARIOS ---
  const [editingUser, setEditingUser] = useState(null);

  const getLocalPartidos = () => {
    const local = localStorage.getItem('pm_local_partidos');
    if (local) {
      try { return JSON.parse(local); } catch { }
    }
    const defaultPartidos = [];
    localStorage.setItem('pm_local_partidos', JSON.stringify(defaultPartidos));
    return defaultPartidos;
  };

  // Carga inicial y recarga
  const loadPartidos = async () => {
    setLoadingPartidos(true);
    try {
      // Intentar obtener partidos de AWS
      const data = await apiRequest('/partidos');
      let partidosList = [];
      if (data && Array.isArray(data)) {
        partidosList = data;
      } else if (data && Array.isArray(data.partidos)) {
        partidosList = data.partidos.map(p => ({
          id: p.partido_id || p.id,
          equipo1: p.equipo_a || p.equipo1,
          equipo2: p.equipo_b || p.equipo2,
          fecha: p.fecha?.split('T')[0] || p.fecha || '',
          hora: p.fecha?.split('T')[1]?.substring(0, 5) || p.hora || '',
          golesRealLocal: p.golesRealLocal !== undefined ? p.golesRealLocal : null,
          golesRealVisitante: p.golesRealVisitante !== undefined ? p.golesRealVisitante : null
        }));
      }

      // Usar la lista oficial de AWS por completo sin combinar con locales duplicados
      const finalPartidos = partidosList;
      setPartidos(finalPartidos);
      localStorage.setItem('pm_local_partidos', JSON.stringify(finalPartidos));
      
      // Inicializar inputs de marcador real
      const scores = {};
      finalPartidos.forEach(p => {
        scores[p.id] = {
          local: p.golesRealLocal !== null && p.golesRealLocal !== undefined ? p.golesRealLocal.toString() : '',
          visitante: p.golesRealVisitante !== null && p.golesRealVisitante !== undefined ? p.golesRealVisitante.toString() : ''
        };
      });
      setRealScores(scores);
    } catch (err) {
      console.warn("Fallo carga de partidos de AWS. Cargando desde localStorage.", err);
      const localList = getLocalPartidos();
      setPartidos(localList);
      
      const scores = {};
      localList.forEach(p => {
        scores[p.id] = {
          local: p.golesRealLocal !== null && p.golesRealLocal !== undefined ? p.golesRealLocal.toString() : '',
          visitante: p.golesRealVisitante !== null && p.golesRealVisitante !== undefined ? p.golesRealVisitante.toString() : ''
        };
      });
      setRealScores(scores);
    } finally {
      setLoadingPartidos(false);
    }
  };

  const getLocalPronosticos = () => {
    const local = localStorage.getItem('pm_local_pronosticos');
    if (local) {
      try { return JSON.parse(local); } catch { }
    }
    return [];
  };

  const loadPronosticos = async () => {
    setLoadingPronosticos(true);
    setPronosticosError(null);
    try {
      const data = await apiRequest('/pronosticos');
      let pronosticosList = [];
      let rawPronosticos = [];






      if (Array.isArray(data)) {
        rawPronosticos = data;
      } else if (data && Array.isArray(data.pronosticos)) {
        rawPronosticos = data.pronosticos;
      }

      pronosticosList = rawPronosticos.map(pr => {
        const cedula = pr.usuario || pr.userCedula || pr.user_id || pr.user_cedula || '';
        const nombre = pr.nombre || pr.nombreJugador || pr.nombre_jugador || 'Jugador';
        const marcador = pr.marcadorCombinado || pr.marcador_combinado || `${pr.golesLocal}-${pr.golesVisitante}`;
        return {
          partidoId: pr.partidoId || pr.partido_id,
          marcadorCombinado: marcador,
          userCedula: cedula.toString().trim(),
          nombreJugador: nombre.toString().trim(),
          estado: pr.estado || 'registrado'
        };
      });


      const localList = getLocalPronosticos();
      const combined = [...localList];
      pronosticosList.forEach(pr => {
        if (!combined.some(c => c.partidoId === pr.partidoId && c.userCedula === pr.userCedula)) {
          combined.push(pr);
        }
      });

      setPronosticos(combined);
      localStorage.setItem('pm_local_pronosticos', JSON.stringify(combined));
    } catch (err) {
      console.warn("Fallo al cargar pronósticos de AWS. Usando almacenamiento local fallback.", err);
      setPronosticos(getLocalPronosticos());
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
      { username: '1234', nombre: 'Administrador Atiempo', rol: 'admin', contrasena: '1234', mustChangePassword: false },
      { username: '123456789', nombre: 'Juan Pérez (Demo)', rol: 'user', contrasena: '123', mustChangePassword: true }
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
      
      const localList = getLocalUsuarios();
      const combinedMap = new Map();
      localList.forEach(u => combinedMap.set(u.username, u));
      list.forEach(u => {
        if (!combinedMap.has(u.username)) {
          combinedMap.set(u.username, {
            username: u.username,
            nombre: u.nombre,
            rol: u.rol || 'user',
            contrasena: u.contrasena || '123',
            mustChangePassword: u.mustChangePassword !== undefined ? u.mustChangePassword : true
          });
        }
      });

      const finalList = Array.from(combinedMap.values());
      setUsuarios(finalList);
      localStorage.setItem('pm_local_usuarios', JSON.stringify(finalList));
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
      loadPronosticos(); 
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

    const newMatch = {
      id: "partido-" + Date.now(),
      equipo1,
      equipo2,
      fecha,
      hora,
      golesRealLocal: null,
      golesRealVisitante: null
    };

    try {
      // 1. Intentar enviar a AWS
      await apiRequest('/partidos', {
        method: 'POST',
        body: JSON.stringify({
          equipo1: equipo1,
          equipo2: equipo2,
          fecha,
          hora
        })
      });
    } catch (err) {
      console.warn("No se pudo registrar partido en AWS, guardando localmente en fallback.", err);
      // 2. Solo persistir localmente en fallback si AWS de verdad falló
      const localList = getLocalPartidos();
      const updated = [newMatch, ...localList];
      localStorage.setItem('pm_local_partidos', JSON.stringify(updated));
      setPartidos(updated);
    }


    // Limpiar formulario
    setCreateSuccess(true);
    setEquipo1('');
    setEquipo2('');
    setFecha('');
    setHora('');
    loadPartidos();
    setTimeout(() => setCreateSuccess(false), 3000);
    setLoadingPartidos(false);
  };

  // Guardar Marcador Real
  const handleSaveRealScore = async (partidoId) => {
    const scores = realScores[partidoId];
    if (!scores) return;

    setSavingScoreId(partidoId);
    const golesLocal = scores.local === '' ? null : parseInt(scores.local);
    const golesVisitante = scores.visitante === '' ? null : parseInt(scores.visitante);

    try {
      // Intentar en AWS
      await apiRequest('/partidos/resultado', {
        method: 'POST',
        body: JSON.stringify({
          partidoId,
          golesRealLocal: golesLocal,
          golesRealVisitante: golesVisitante
        })
      });
    } catch (err) {
      console.warn("No se pudo actualizar marcador en AWS (Lambda mock), actualizando localmente.");
    }

    // Actualizar localmente
    const localList = getLocalPartidos();
    const updated = localList.map(p => {
      if (p.id === partidoId) {
        return { ...p, golesRealLocal: golesLocal, golesRealVisitante: golesVisitante };
      }
      return p;
    });
    localStorage.setItem('pm_local_partidos', JSON.stringify(updated));
    setPartidos(updated);

    // Recalcular pronósticos ganados si existen localmente
    const localPronosticos = getLocalPronosticos();
    const updatedPronos = localPronosticos.map(pr => {
      if (pr.partidoId === partidoId) {
        // Lógica simple de puntuación si es necesario o cambio de estado
        return { ...pr, estado: 'procesado' };
      }
      return pr;
    });
    localStorage.setItem('pm_local_pronosticos', JSON.stringify(updatedPronos));

    await Promise.all([loadPartidos(), loadPronosticos()]);
    setSavingScoreId(null);
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
      contrasena: newUserPassword,
      mustChangePassword: newUserPassword === '123'
    };

    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify(newUserObj)
      });
    } catch (err) {
      console.warn("Fallo al crear usuario en AWS. Intentando guardar localmente.", err);
    }

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
    } catch (err) {
      console.warn("Fallo al eliminar usuario en AWS. Intentando borrar localmente.", err);
    }

    try {
      const localList = getLocalUsuarios();
      const updatedList = localList.filter(u => u.username !== username);
      localStorage.setItem('pm_local_usuarios', JSON.stringify(updatedList));
      setUsuarios(updatedList);
    } catch (localErr) {
      setUsuariosError(localErr.message || 'Error al eliminar usuario localmente');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Guardar Edición de Usuario
  const handleSaveEditUser = async (updatedUser) => {
    // 1. Guardar localmente
    const localList = getLocalUsuarios();
    const updated = localList.map(u => {
      if (u.username === updatedUser.username) {
        return {
          ...u,
          nombre: updatedUser.nombre,
          rol: updatedUser.rol,
          contrasena: updatedUser.contrasena,
          // Si cambian la contraseña de '123' a otra, quitar la obligación de reset
          mustChangePassword: updatedUser.contrasena === '123'
        };
      }
      return u;
    });
    localStorage.setItem('pm_local_usuarios', JSON.stringify(updated));
    setUsuarios(updated);

    // 2. Intentar guardar en AWS
    try {
      await apiRequest(`/usuarios/${updatedUser.username}`, {
        method: 'PUT',
        body: JSON.stringify(updatedUser)
      });
    } catch (e) {
      console.warn("No se pudo actualizar usuario en AWS (Lambda mock), pero ya quedó editado localmente.");
    }
  };

  const handleCedulaInputChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setNewUserCedula(val);
    }
  };

  // Renderizar bandera del país perfectamente redonda
  const renderFlag = (teamName) => {
    const flagUrl = getCountryFlagUrl(teamName);
    if (flagUrl) {
      return (
        <div className="inline-flex h-6 w-6 rounded-full overflow-hidden border border-brand-blue-800/40 shrink-0 align-middle mr-2 bg-brand-blue-950">
          <img src={flagUrl} alt={teamName} className="w-full h-full object-cover scale-110" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mt-8 animate-fade-in space-y-6">
      {/* ELIMINADAS PESTAÑAS INTERNAS Y TÍTULO GENERAL - Sidebar controla el ruteo limpio */}
      
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
                <span>¡Partido creado correctamente!</span>
              </div>
            )}
            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Equipo Local</label>
                <CountrySelector value={equipo1} onChange={setEquipo1} placeholder="Selecciona Local" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Equipo Visitante</label>
                <CountrySelector value={equipo2} onChange={setEquipo2} placeholder="Selecciona Visitante" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-brand-blue-900 border border-gold-500/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Hora</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-brand-blue-900 border border-gold-500/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingPartidos}
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
              >
                <Plus size={16} />
                <span>{loadingPartidos ? 'Creando...' : 'Crear Partido'}</span>
              </button>
            </form>
          </div>

          {/* Listado de Partidos */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold gold-gradient-text">Partidos Programados</h3>
              <button 
                onClick={loadPartidos}
                className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95 animate-none"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingPartidos ? (
              <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-gold-500" />
                <span>Cargando partidos...</span>
              </div>
            ) : partidos.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No hay partidos programados en este momento.</div>
            ) : (
              <div className="overflow-x-auto w-full pb-2">

                <div className="space-y-4 min-w-[650px]">
                  {partidos.map((partido) => {
                    const score = realScores[partido.id] || { local: '', visitante: '' };
                    const isSaving = savingScoreId === partido.id;

                    return (
                      <div key={partido.id} className="p-4 rounded-xl bg-brand-blue-900/40 border border-brand-blue-800/60 flex justify-between items-center gap-4 hover:border-gold-500/20 transition-all">
                        
                        {/* Equipos */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2 flex-1 justify-end text-right font-bold text-sm text-white">
                            <span className="truncate max-w-[120px]">{partido.equipo1}</span>
                            {renderFlag(partido.equipo1)}
                          </div>
                          <div className="text-xs font-black px-2.5 py-1 rounded bg-brand-blue-800 text-brand-blue-400 shrink-0">VS</div>
                          <div className="flex items-center gap-2 flex-1 justify-start font-bold text-sm text-white">
                            {renderFlag(partido.equipo2)}
                            <span className="truncate max-w-[120px]">{partido.equipo2}</span>
                          </div>
                        </div>

                        {/* Marcador Real */}
                        <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-xl border border-brand-blue-800 shrink-0 justify-center">
                          <input
                            type="number"
                            min="0"
                            value={score.local}
                            onChange={(e) => setRealScores({
                              ...realScores,
                              [partido.id]: { ...score, local: e.target.value }
                            })}
                            placeholder="-"
                            className="w-10 bg-brand-blue-900 border border-brand-blue-800 text-white font-bold text-center rounded py-1 px-0.5 focus:outline-none focus:border-gold-500"
                          />
                          <span className="text-gray-600 font-bold">:</span>
                          <input
                            type="number"
                            min="0"
                            value={score.visitante}
                            onChange={(e) => setRealScores({
                              ...realScores,
                              [partido.id]: { ...score, visitante: e.target.value }
                            })}
                            placeholder="-"
                            className="w-10 bg-brand-blue-900 border border-brand-blue-800 text-white font-bold text-center rounded py-1 px-0.5 focus:outline-none focus:border-gold-500"
                          />
                          <button
                            onClick={() => handleSaveRealScore(partido.id)}
                            disabled={isSaving}
                            className="ml-2 p-2 rounded-lg bg-gold-500 text-black font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                            title="Guardar marcador oficial"
                          >
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                          </button>
                        </div>

                        {/* Info adicional */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-gray-400 flex items-center justify-end gap-1">
                            <Clock size={12} className="text-gold-500" />
                            <span>{partido.fecha} | {partido.hora}</span>
                          </div>
                          {partido.golesRealLocal !== null && (
                            <div className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-wider text-right">Resultado Registrado</div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PESTAÑA: PRONÓSTICOS POR PARTIDO (SECCIONADO POR PARTIDOS) */}
      {activeTab === 'pronosticos' && (
        <div className="glass-card rounded-2xl p-6 border border-gold-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold gold-gradient-text">Monitoreo de Pronósticos</h3>
              <p className="text-xs text-gray-400">Pronósticos de los jugadores agrupados por cada partido programado.</p>
            </div>
            <button 
              onClick={loadPronosticos}
              className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {pronosticosError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{pronosticosError}</span>
            </div>
          )}

          {loadingPronosticos ? (
            <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-gold-500" />
              <span>Cargando pronósticos...</span>
            </div>
          ) : partidos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay partidos programados todavía.</div>
          ) : (
            <div className="space-y-6">
              {partidos.map((partido) => {
                // Filtrar pronósticos correspondientes a este partido
                const pronosticosPartido = pronosticos.filter(
                  p => p.partidoId === partido.id
                );

                return (
                  <div key={partido.id} className="p-5 rounded-2xl bg-brand-blue-900/30 border border-brand-blue-800/50 space-y-4 hover:border-gold-500/20 transition-all">
                    {/* Encabezado del Partido */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pb-3 border-b border-brand-blue-800/50">
                      <div className="flex items-center gap-2">
                        {renderFlag(partido.equipo1)}
                        <span className="font-extrabold text-white text-sm sm:text-base">{partido.equipo1}</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-brand-blue-800 text-brand-blue-400">VS</span>
                        {renderFlag(partido.equipo2)}
                        <span className="font-extrabold text-white text-sm sm:text-base">{partido.equipo2}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-bold bg-[#090d16] px-3 py-1 rounded-full border border-brand-blue-800">
                        {partido.fecha} | {partido.hora}
                      </div>
                    </div>

                    {/* Pronósticos de los usuarios */}
                    {pronosticosPartido.length === 0 ? (
                      <div className="text-xs text-gray-500 italic py-2">Ningún jugador ha enviado pronóstico para este partido todavía.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pronosticosPartido.map((p, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-brand-blue-950 border border-brand-blue-900/60 flex items-center justify-between gap-3 hover:border-gold-500/10 transition-all">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{p.nombreJugador}</p>
                              <p className="text-[10px] text-gray-500 font-semibold">CC @{p.userCedula}</p>
                            </div>
                            <div className="shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                              <span className="text-sm font-black text-emerald-400 tracking-wider">{p.marcadorCombinado}</span>
                            </div>
                          </div>
                        ))}
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Contraseña inicial"
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
                            u.rol === 'admin'
                              ? 'bg-gold-500/10 text-gold-500 border-gold-500/20'
                              : 'bg-brand-blue-800/40 text-brand-blue-500 border-brand-blue-800/60'
                          }`}>
                            {u.rol === 'admin' ? 'Administrador' : 'Jugador'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-2 rounded-lg border bg-gold-500/10 border-gold-500/20 text-gold-500 hover:bg-gold-500/30 transition-all"
                            title="Editar usuario"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.username)}
                            disabled={u.username === '1234' || u.username === '1000000000'}
                            className={`p-2 rounded-lg border transition-all ${
                              u.username === '1234' || u.username === '1000000000'
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

      {/* Modal de Edición de Usuario */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveEditUser}
        />
      )}
    </div>
  );
}
