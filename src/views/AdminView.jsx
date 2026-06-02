import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { calcularPuntuacionYMensaje } from '../utils/points';
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
  Pencil,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function AdminView({ activeSection, onSectionChange }) {
  const activeTab = activeSection || 'partidos';
  const setActiveTab = onSectionChange || (() => {});
  
  // --- ESTADOS DE PARTIDOS ---
  const [partidos, setPartidos] = useState([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('Todos');
  const [faseFilterAdmin, setFaseFilterAdmin] = useState('Todos');
  const [equipo1, setEquipo1] = useState('');
  const [equipo2, setEquipo2] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [fase, setFase] = useState('Fase de Grupos');
  const [grupo, setGrupo] = useState('A');
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
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuariosError, setUsuariosError] = useState(null);
  const [usuariosSuccess, setUsuariosSuccess] = useState(false);

  // --- EDICIÓN DE USUARIOS ---
  const [editingUser, setEditingUser] = useState(null);

  // --- BÚSQUEDA Y ORDENACIÓN DE USUARIOS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('nombre'); // 'username', 'nombre', 'rol'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getProcessedUsuarios = () => {
    let list = [...usuarios];
    
    // 1. Filtrar por cédula o nombre
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(u => {
        const cedula = (u.username || '').toLowerCase();
        const nombre = (u.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return cedula.includes(term) || nombre.includes(term);
      });
    }

    // 2. Ordenar por la columna seleccionada
    list.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (typeof valB === 'string') valB = valB.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  };

  const renderSortHeader = (field, label) => {
    const isSorted = sortField === field;
    return (
      <th 
        className="py-3 px-4 cursor-pointer hover:bg-brand-blue-800/30 select-none group transition-all"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-gray-400 group-hover:text-gold-500 transition-colors">
            {isSorted ? (
              sortDirection === 'asc' ? <ArrowUp size={12} className="text-gold-500" /> : <ArrowDown size={12} className="text-gold-500" />
            ) : (
              <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const getPhaseName = (tab) => {
    switch (tab) {
      case 'fase-grupos': return 'Fase de Grupos';
      case 'fase-16': return 'Dieciseisavos';
      case 'fase-8': return 'Octavos';
      case 'fase-4': return 'Cuartos';
      case 'fase-2': return 'Semifinal';
      case 'fase-1': return 'Final';
      default: return '';
    }
  };

  const getLeaderboard = () => {
    const playersOnly = usuarios.filter(user => user.rol !== 'admin');
    const leaderboard = playersOnly.map(user => {
      const userPronos = pronosticos.filter(p => p.userCedula === user.username);
      let totalPuntos = 0;
      let aciertosExactos = 0;
      let aciertosGanador = 0;
      let aciertosEmpate = 0;
      
      userPronos.forEach(prono => {
        const match = partidos.find(p => p.id === prono.partidoId);
        if (match && match.golesRealLocal !== null && match.golesRealVisitante !== null) {
          const res = calcularPuntuacionYMensaje(match, prono);
          totalPuntos += res.puntos;
          if (res.puntos === 5) {
            aciertosExactos += 1;
          } else if (res.puntos === 3) {
            aciertosGanador += 1;
          } else if (res.puntos === 1) {
            aciertosEmpate += 1;
          }
        }
      });
      
      return {
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
        puntos: totalPuntos,
        aciertosExactos,
        aciertosGanador,
        aciertosEmpate
      };
    });
    
    leaderboard.sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
    return leaderboard;
  };

  const renderAdminMatchRow = (partido) => {
    const score = realScores[partido.id] || { local: '', visitante: '' };
    const isSaving = savingScoreId === partido.id;
    const isEmpate = score.local !== '' && score.visitante !== '' && parseInt(score.local) === parseInt(score.visitante);
    const showPenaltisSelector = partido.fase !== 'Fase de Grupos' && isEmpate;

    return (
      <div key={partido.id} className="p-4 rounded-xl bg-brand-blue-900/40 border border-brand-blue-800/60 flex flex-col gap-3 hover:border-gold-500/20 transition-all">
        
        <div className="flex flex-col justify-between items-center gap-4">
          {/* Equipos */}
          <div className="flex items-center gap-2 md:gap-4 w-full justify-center overflow-x-auto whitespace-nowrap scrollbar-none py-1 px-2">
            <div className="flex items-center gap-2 justify-end text-right font-bold text-sm text-white shrink-0">
              <span className="font-bold text-sm text-white whitespace-nowrap">{partido.equipo1}</span>
              {renderFlag(partido.equipo1)}
            </div>
            <div className="text-xs font-black px-2.5 py-1 rounded bg-brand-blue-800 text-brand-blue-400 shrink-0">VS</div>
            <div className="flex items-center gap-2 justify-start font-bold text-sm text-white shrink-0">
              {renderFlag(partido.equipo2)}
              <span className="font-bold text-sm text-white whitespace-nowrap">{partido.equipo2}</span>
            </div>
          </div>

          {/* Marcador Real y Info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full shrink-0">
            <div className="text-center">
              <div className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-1 justify-center">
                <Clock size={11} className="text-gold-500" />
                <span>{partido.fecha} | {partido.hora}</span>
              </div>
              {partido.golesRealLocal !== null && (
                <div className="text-[9px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider text-center">Resultado Registrado</div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-xl border border-brand-blue-800 justify-center w-full sm:w-auto">
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
                disabled={isSaving || (showPenaltisSelector && !score.ganadorPenaltis)}
                className="ml-2 p-2 rounded-lg bg-gold-500 text-black font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                title="Guardar marcador oficial"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Selector de Penaltis / Clasificado */}
        {showPenaltisSelector && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-lg bg-[#090d16] border border-gold-500/20 text-xs">
            <span className="text-gold-500 font-black flex items-center gap-1">
              ⚽ Empate en eliminación directa. Selecciona quién clasifica:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRealScores({
                  ...realScores,
                  [partido.id]: { ...score, ganadorPenaltis: partido.equipo1 }
                })}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                  score.ganadorPenaltis === partido.equipo1
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-brand-blue-900 border-brand-blue-800 text-gray-400 hover:text-white'
                }`}
              >
                {renderFlag(partido.equipo1)} Clasifica {partido.equipo1}
              </button>
              <button
                type="button"
                onClick={() => setRealScores({
                  ...realScores,
                  [partido.id]: { ...score, ganadorPenaltis: partido.equipo2 }
                })}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                  score.ganadorPenaltis === partido.equipo2
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-brand-blue-900 border-brand-blue-800 text-gray-400 hover:text-white'
                }`}
              >
                {renderFlag(partido.equipo2)} Clasifica {partido.equipo2}
              </button>
            </div>
          </div>
        )}
        {partido.golesRealLocal !== null && partido.golesRealVisitante !== null && partido.golesRealLocal === partido.golesRealVisitante && partido.ganadorPenaltis && (
          <div className="text-center text-[10px] text-emerald-400 bg-emerald-500/5 py-1.5 px-2.5 border border-emerald-500/10 rounded-lg font-bold flex items-center justify-center gap-1">
            <span>Clasificado Oficial en Penales:</span>
            {renderFlag(partido.ganadorPenaltis)}
            <span className="underline font-bold text-white">{partido.ganadorPenaltis}</span>
          </div>
        )}
      </div>
    );
  };

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
        partidosList = data.map(p => {
          const matchId = p.id || p.partido_id;
          const localList = JSON.parse(localStorage.getItem('pm_local_partidos') || '[]');
          const localMatch = localList.find(lm => lm.id === matchId);
          return {
            id: matchId,
            equipo1: p.equipo1 || p.equipo_a,
            equipo2: p.equipo2 || p.equipo_b,
            fecha: p.fecha || '',
            hora: p.hora || '',
            fase: p.fase || 'Fase de Grupos',
            grupo: p.grupo || null,
            golesRealLocal: p.golesRealLocal !== undefined && p.golesRealLocal !== null ? p.golesRealLocal : (localMatch?.golesRealLocal !== undefined ? localMatch.golesRealLocal : null),
            golesRealVisitante: p.golesRealVisitante !== undefined && p.golesRealVisitante !== null ? p.golesRealVisitante : (localMatch?.golesRealVisitante !== undefined ? localMatch.golesRealVisitante : null),
            ganadorPenaltis: p.ganadorPenaltis || p.ganador_penaltis || localMatch?.ganadorPenaltis || null
          };
        });
      } else if (data && Array.isArray(data.partidos)) {
        partidosList = data.partidos.map(p => {
          const matchId = p.partido_id || p.id;
          const localList = JSON.parse(localStorage.getItem('pm_local_partidos') || '[]');
          const localMatch = localList.find(lm => lm.id === matchId);
          return {
            id: matchId,
            equipo1: p.equipo_a || p.equipo1,
            equipo2: p.equipo_b || p.equipo2,
            fecha: p.fecha?.split('T')[0] || p.fecha || '',
            hora: p.fecha?.split('T')[1]?.substring(0, 5) || p.hora || '',
            fase: p.fase || 'Fase de Grupos',
            grupo: p.grupo || null,
            golesRealLocal: p.golesRealLocal !== undefined && p.golesRealLocal !== null ? p.golesRealLocal : (localMatch?.golesRealLocal !== undefined ? localMatch.golesRealLocal : null),
            golesRealVisitante: p.golesRealVisitante !== undefined && p.golesRealVisitante !== null ? p.golesRealVisitante : (localMatch?.golesRealVisitante !== undefined ? localMatch.golesRealVisitante : null),
            ganadorPenaltis: p.ganadorPenaltis || p.ganador_penaltis || localMatch?.ganadorPenaltis || null
          };
        });
      }

      const sortPartidos = (lista) => {
        return lista.sort((a, b) => {
          const dtA = (a.fecha || '9999-99-99') + 'T' + (a.hora || '99:99');
          const dtB = (b.fecha || '9999-99-99') + 'T' + (b.hora || '99:99');
          return dtA.localeCompare(dtB);
        });
      };

      // Usar la lista oficial de AWS por completo sin combinar con locales duplicados
      const finalPartidos = sortPartidos(partidosList);
      setPartidos(finalPartidos);
      localStorage.setItem('pm_local_partidos', JSON.stringify(finalPartidos));
      
      // Inicializar inputs de marcador real
      const scores = {};
      finalPartidos.forEach(p => {
        scores[p.id] = {
          local: p.golesRealLocal !== null && p.golesRealLocal !== undefined ? p.golesRealLocal.toString() : '',
          visitante: p.golesRealVisitante !== null && p.golesRealVisitante !== undefined ? p.golesRealVisitante.toString() : '',
          ganadorPenaltis: p.ganadorPenaltis || ''
        };
      });
      setRealScores(scores);
    } catch (err) {
      console.warn("Fallo carga de partidos de AWS. Cargando desde localStorage.", err);
      const localList = getLocalPartidos();
      
      const sortPartidos = (lista) => {
        return lista.sort((a, b) => {
          const dtA = (a.fecha || '9999-99-99') + 'T' + (a.hora || '99:99');
          const dtB = (b.fecha || '9999-99-99') + 'T' + (b.hora || '99:99');
          return dtA.localeCompare(dtB);
        });
      };
      
      const finalLocal = sortPartidos(localList);
      setPartidos(finalLocal);
      
      const scores = {};
      localList.forEach(p => {
        scores[p.id] = {
          local: p.golesRealLocal !== null && p.golesRealLocal !== undefined ? p.golesRealLocal.toString() : '',
          visitante: p.golesRealVisitante !== null && p.golesRealVisitante !== undefined ? p.golesRealVisitante.toString() : '',
          ganadorPenaltis: p.ganadorPenaltis || ''
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
        const gl = pr.golesLocal !== undefined ? pr.golesLocal : parseInt(marcador.split('-')[0] || '0');
        const gv = pr.golesVisitante !== undefined ? pr.golesVisitante : parseInt(marcador.split('-')[1] || '0');
        return {
          partidoId: pr.partidoId || pr.partido_id,
          marcadorCombinado: marcador,
          userCedula: cedula.toString().trim(),
          nombreJugador: nombre.toString().trim(),
          estado: pr.estado || 'registrado',
          golesLocal: isNaN(gl) ? 0 : gl,
          golesVisitante: isNaN(gv) ? 0 : gv,
          ganadorPenaltis: pr.ganadorPenaltis || pr.ganador_penaltis || null
        };
      });


      setPronosticos(pronosticosList);
      localStorage.setItem('pm_local_pronosticos', JSON.stringify(pronosticosList));
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
      try {
        const parsed = JSON.parse(local);
        // Purga activa de los usuarios de prueba creados localmente
        return parsed.filter(u => u.username !== '1234' && u.username !== '123456789');
      } catch { }
    }
    const defaultUsers = [];
    localStorage.setItem('pm_local_usuarios', JSON.stringify(defaultUsers));
    return defaultUsers;
  };

  const loadUsuarios = async () => {
    setLoadingUsuarios(true);
    setUsuariosError(null);
    try {
      const data = await apiRequest('/usuarios');
      const list = Array.isArray(data) ? data : [];
      
      const formattedList = list.map(u => ({
        username: u.username,
        nombre: u.nombre,
        rol: u.rol || 'user',
        contrasena: u.contrasena || '123',
        mustChangePassword: u.mustChangePassword !== undefined ? u.mustChangePassword : true
      }));

      setUsuarios(formattedList);
      localStorage.setItem('pm_local_usuarios', JSON.stringify(formattedList));
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
    if (activeTab === 'usuarios') {
      loadUsuarios();
    } else if (activeTab === 'partidos') {
      loadPartidos();
    } else if (activeTab === 'puntuacion') {
      loadUsuarios();
      loadPartidos();
      loadPronosticos();
    } else {
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
      fase,
      grupo: fase === 'Fase de Grupos' ? grupo : null,
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
          hora,
          fase,
          grupo: fase === 'Fase de Grupos' ? grupo : null
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
    setFase('Fase de Grupos');
    setGrupo('A');
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
    const ganadorPenaltis = (golesLocal !== null && golesVisitante !== null && golesLocal === golesVisitante)
      ? (scores.ganadorPenaltis || null)
      : null;

    try {
      // Intentar en AWS
      await apiRequest('/partidos/resultado', {
        method: 'POST',
        body: JSON.stringify({
          partidoId,
          golesRealLocal: golesLocal,
          golesRealVisitante: golesVisitante,
          ganadorPenaltis,
          ganador_penaltis: ganadorPenaltis
        })
      });
    } catch (err) {
      console.warn("No se pudo actualizar marcador en AWS (Lambda mock), actualizando localmente.");
    }

    // Actualizar localmente
    const localList = getLocalPartidos();
    const updated = localList.map(p => {
      if (p.id === partidoId) {
        return { ...p, golesRealLocal: golesLocal, golesRealVisitante: golesVisitante, ganadorPenaltis };
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
    if (!newUserPassword.trim()) {
      setUsuariosError('La contraseña temporal es obligatoria');
      return;
    }
    if (!/^\d+$/.test(newUserPassword)) {
      setUsuariosError('La contraseña debe contener solo números');
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
      mustChangePassword: true // Siempre obligar a cambiar contraseña la primera vez
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
      setNewUserPassword('');
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
      
      {/* 1. PESTAÑA: GENERAR PARTIDOS */}
      {activeTab === 'partidos' && (
        <div className="max-w-xl mx-auto">
          {/* Formulario Crear Partido */}
          <div className="glass-card rounded-2xl p-6 border border-gold-500/10 shadow-2xl">
            <h3 className="text-xl font-bold gold-gradient-text mb-4 text-center">Generar Nuevo Partido</h3>
            
            {createSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={14} />
                <span>¡Partido creado y asignado exitosamente!</span>
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

              <div>
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Fase del Torneo</label>
                <select
                  value={fase}
                  onChange={(e) => setFase(e.target.value)}
                  className="w-full bg-brand-blue-900 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                >
                  <option value="Fase de Grupos">Fase de Grupos</option>
                  <option value="Dieciseisavos">Dieciseisavos</option>
                  <option value="Octavos">Octavos</option>
                  <option value="Cuartos">Cuartos</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Final">Final</option>
                </select>
              </div>

              {fase === 'Fase de Grupos' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Grupo</label>
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    className="w-full bg-brand-blue-900 border border-gold-500/10 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loadingPartidos}
                className="w-full py-3.5 rounded-xl font-extrabold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
              >
                <Plus size={16} />
                <span>{loadingPartidos ? 'Generando...' : 'Generar Partido'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE FASES DE PARTIDOS */}
      {activeTab.startsWith('fase-') && (
        <div className="glass-card rounded-2xl p-6 border border-gold-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black gold-gradient-text tracking-wide">{getPhaseName(activeTab)}</h3>
              <p className="text-xs text-gray-400">Listado de partidos programados y registro de marcadores oficiales.</p>
            </div>
            <button 
              onClick={loadPartidos}
              className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {activeTab === 'fase-grupos' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-blue-900/20 border border-brand-blue-800/40 p-4 rounded-xl">
              <span className="text-xs font-bold uppercase text-brand-blue-400">Filtrar por Grupo del Mundial:</span>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
              >
                <option value="Todos">Ver Todos los Grupos</option>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                  <option key={g} value={g}>Grupo {g}</option>
                ))}
              </select>
            </div>
          )}

          {loadingPartidos ? (
            <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-gold-500" />
              <span>Cargando partidos...</span>
            </div>
          ) : (
            <>
              {activeTab === 'fase-grupos' ? (
                // Fase de Grupos organizada por Grupo A a L
                <div className="space-y-6">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
                    .filter(grp => selectedGroupFilter === 'Todos' || selectedGroupFilter === grp)
                    .map((grp) => {
                    const partidosGrupo = partidos.filter(p => p.fase === 'Fase de Grupos' && p.grupo === grp);
                    
                    return (
                      <div key={grp} className="p-4 rounded-xl bg-brand-blue-900/20 border border-brand-blue-800/40 space-y-3">
                        <h4 className="text-sm font-black text-gold-500 tracking-wider uppercase border-b border-brand-blue-800/40 pb-2">Grupo {grp}</h4>
                        {partidosGrupo.length === 0 ? (
                          <p className="text-xs text-gray-500 italic py-1">No hay partidos programados en este grupo.</p>
                        ) : (
                          <div className="space-y-3">
                            {partidosGrupo.map((partido) => renderAdminMatchRow(partido))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Otras fases: lista plana
                (() => {
                  const faseName = getPhaseName(activeTab);
                  const partidosFase = partidos.filter(p => p.fase === faseName);
                  if (partidosFase.length === 0) {
                    return <div className="py-12 text-center text-gray-500">No hay partidos programados para esta fase en este momento.</div>;
                  }
                  return (
                    <div className="space-y-3">
                      {partidosFase.map((partido) => renderAdminMatchRow(partido))}
                    </div>
                  );
                })()
              )}
            </>
          )}
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-blue-900/20 border border-brand-blue-800/40 p-4 rounded-xl">
            <span className="text-xs font-bold uppercase text-brand-blue-400">Filtrar por Fase:</span>
            <select
              value={faseFilterAdmin}
              onChange={(e) => setFaseFilterAdmin(e.target.value)}
              className="bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
            >
              <option value="Todos">Todas las Fases</option>
              <option value="Fase de Grupos">Fase de Grupos</option>
              <option value="Dieciseisavos">Dieciseisavos</option>
              <option value="Octavos">Octavos</option>
              <option value="Cuartos">Cuartos</option>
              <option value="Semifinal">Semifinal</option>
              <option value="Final">Final</option>
            </select>
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
              {['Fase de Grupos', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Final']
                .filter(f => faseFilterAdmin === 'Todos' || faseFilterAdmin === f)
                .map((faseName) => {
                  const partidosFase = partidos.filter(p => p.fase === faseName);
                  if (partidosFase.length === 0) return null;

                  return (
                    <div key={faseName} className="space-y-4">
                      <h4 className="text-sm font-black text-gold-500 tracking-wider uppercase border-b border-brand-blue-800/40 pb-2">{faseName}</h4>
                      {partidosFase.map((partido) => {
                        // Filtrar pronósticos correspondientes a este partido
                        const pronosticosPartido = pronosticos.filter(
                          p => p.partidoId === partido.id
                        );

                        return (
                          <div key={partido.id} className="p-5 rounded-2xl bg-brand-blue-900/30 border border-brand-blue-800/50 space-y-4 hover:border-gold-500/20 transition-all">
                            {/* Encabezado del Partido */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pb-3 border-b border-brand-blue-800/50">
                              <div className="flex flex-wrap items-center gap-2">
                                {renderFlag(partido.equipo1)}
                                <span className="font-extrabold text-white text-sm sm:text-base">{partido.equipo1}</span>
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-brand-blue-800 text-brand-blue-400">VS</span>
                                {renderFlag(partido.equipo2)}
                                <span className="font-extrabold text-white text-sm sm:text-base">{partido.equipo2}</span>
                                {partido.golesRealLocal !== null && partido.golesRealVisitante !== null && (
                                  <span className="ml-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                                    Oficial: {partido.golesRealLocal} - {partido.golesRealVisitante}
                                  </span>
                                )}
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
                                {pronosticosPartido.map((p, idx) => {
                                  const hasOfficialResult = partido.golesRealLocal !== null && partido.golesRealVisitante !== null;
                                  let exacto = false;
                                  let ganador = false;
                                  let puntosObtenidos = 0;

                                  if (hasOfficialResult) {
                                    const res = calcularPuntuacionYMensaje(partido, p);
                                    puntosObtenidos = res.puntos;
                                    if (res.puntos === 5) {
                                      exacto = true;
                                    } else if (res.puntos === 3 || res.puntos === 1) {
                                      ganador = true;
                                    }
                                  }

                                  let statusClasses = 'bg-brand-blue-900/40 border-brand-blue-800 text-gray-300';
                                  if (hasOfficialResult) {
                                    if (exacto) {
                                      statusClasses = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5 font-bold';
                                    } else if (ganador) {
                                      statusClasses = 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400 font-semibold';
                                    } else {
                                      statusClasses = 'bg-rose-500/10 border-rose-500/20 text-rose-300';
                                    }
                                  }

                                  return (
                                    <div key={idx} className="p-3 rounded-xl bg-brand-blue-950 border border-brand-blue-900/60 flex items-center justify-between gap-3 hover:border-gold-500/10 transition-all">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{p.nombreJugador || p.usuario || 'Jugador'}</p>
                                        <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1.5 flex-wrap">
                                          <span>CC @{p.userCedula || p.usuario || 'CC'}</span>
                                          {hasOfficialResult && (
                                            <span className={`text-[9px] font-bold px-1 rounded ${
                                              puntosObtenidos === 5 ? 'text-emerald-400 bg-emerald-400/10' : puntosObtenidos >= 1 ? 'text-yellow-400 bg-yellow-400/10' : 'text-rose-400 bg-rose-400/10'
                                            }`}>
                                              +{puntosObtenidos} pts
                                            </span>
                                          )}
                                        </p>
                                        {partido.fase !== 'Fase de Grupos' && p.golesLocal === p.golesVisitante && (
                                          <p className="text-[9px] text-gold-500/80 font-bold mt-0.5 flex items-center gap-1">
                                            <span>Clasifica:</span>
                                            {renderFlag(p.ganadorPenaltis)}
                                            <span className="underline">{p.ganadorPenaltis || 'No seleccionado'}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div className={`shrink-0 px-3 py-1.5 rounded-lg border text-sm font-black tracking-wider transition-all ${statusClasses}`}>
                                        <span>{p.marcadorCombinado}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })}
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
                <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Contraseña Inicial (Solo Números)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUserPassword}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setNewUserPassword(val);
                      }
                    }}
                    placeholder="ej. 12345 (Clave temporal numérica)"
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

            {/* Barra de Búsqueda */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cédula o nombre..."
                className="w-full bg-[#090d16] border border-gold-500/15 focus:border-gold-500/50 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold-500/50 transition-all placeholder:text-gray-500"
              />
              <Search className="absolute left-3.5 top-3 text-gray-500" size={16} />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-2.5 text-xs bg-brand-blue-900 hover:bg-brand-blue-800 border border-brand-blue-800 text-gray-400 hover:text-white px-2 py-0.5 rounded transition-all"
                >
                  Limpiar
                </button>
              )}
            </div>

            {loadingUsuarios ? (
              <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin text-gold-500" />
                <span>Cargando lista de usuarios...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No hay usuarios registrados.</div>
            ) : getProcessedUsuarios().length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed border-brand-blue-800 rounded-xl">
                No se encontraron usuarios para "{searchTerm}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-brand-blue-800 text-brand-blue-600 text-xs font-bold uppercase tracking-wider">
                      {renderSortHeader('username', 'Cédula')}
                      {renderSortHeader('nombre', 'Nombre')}
                      {renderSortHeader('rol', 'Rol')}
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getProcessedUsuarios().map((u) => (
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

      {/* 4. PESTAÑA: TABLA DE PUNTUACIÓN */}
      {activeTab === 'puntuacion' && (
        <div className="glass-card rounded-2xl p-6 border border-gold-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black gold-gradient-text tracking-wide">Tabla de Puntuaciones</h3>
              <p className="text-xs text-gray-400">Tabla de clasificación en tiempo real de todos los jugadores.</p>
            </div>
            <button 
              onClick={() => { loadUsuarios(); loadPartidos(); loadPronosticos(); }}
              className="p-2 rounded-lg bg-brand-blue-900/60 border border-brand-blue-800 text-gray-400 hover:text-white transition-all hover:bg-brand-blue-800/80 active:scale-95"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-brand-blue-800 text-brand-blue-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Posición</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-4">Cédula</th>
                  <th className="py-3 px-4 text-center">Pleno (5 pts)</th>
                  <th className="py-3 px-4 text-center">Ganador (3 pts)</th>
                  <th className="py-3 px-4 text-center">Empate (1 pt)</th>
                  <th className="py-3 px-4 text-right">Puntos Totales</th>
                </tr>
              </thead>
              <tbody>
                {getLeaderboard().map((row, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;
                  
                  return (
                    <tr key={row.username} className={`border-b border-brand-blue-800/40 hover:bg-brand-blue-800/10 transition-colors ${
                      isTop1 ? 'bg-gold-500/5' : ''
                    }`}>
                      <td className="py-3 px-4 font-black">
                        {isTop1 ? (
                          <span className="text-gold-500 flex items-center gap-1">🥇 1º</span>
                        ) : isTop2 ? (
                          <span className="text-gray-300 flex items-center gap-1">🥈 2º</span>
                        ) : isTop3 ? (
                          <span className="text-amber-600 flex items-center gap-1">🥉 3º</span>
                        ) : (
                          <span className="text-gray-400 pl-1">{index + 1}º</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white font-bold">{row.nombre}</td>
                      <td className="py-3 px-4 text-gray-500">@{row.username}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">{row.aciertosExactos}</td>
                      <td className="py-3 px-4 text-center font-bold text-brand-blue-400">{row.aciertosGanador}</td>
                      <td className="py-3 px-4 text-center font-bold text-orange-400">{row.aciertosEmpate}</td>
                      <td className="py-3 px-4 text-right font-black text-gold-500 text-base">{row.puntos} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
