import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { calcularPuntuacionYMensaje } from '../utils/points';
import { getCountryFlagUrl } from '../utils/flags';
import { getBettingWindowStatus } from '../utils/bettingWindow';
import { 
  Trophy, 
  RefreshCw, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Lock, 
  Unlock, 
  UserSquare2,
  Eye,
  EyeOff
} from 'lucide-react';

export default function UserView({ activeSection }) {
  const { user, login, updateUser } = useAuth();
  
  // Datos
  const [partidos, setPartidos] = useState([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('Todos');
  const [faseFilterUser, setFaseFilterUser] = useState('Todos');
  const [todosPronosticos, setTodosPronosticos] = useState([]);
  const [misPronosticos, setMisPronosticos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Estados de carga e interacción
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selección temporal de marcador por partidoId
  // { [partidoId]: { golesLocal: '', golesVisitante: '' } }
  const [pronosticoInputs, setPronosticoInputs] = useState({});
  const [apuestaLoading, setApuestaLoading] = useState({});
  const [apuestaError, setApuestaError] = useState({});
  const [apuestaSuccess, setApuestaSuccess] = useState({});

  // Estados para Cambiar Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [todosPartidos, pronosticosCargados, usuariosCargados] = await Promise.all([
        apiRequest('/partidos'),
        apiRequest('/pronosticos'),
        apiRequest('/usuarios').catch(() => {
          const cached = localStorage.getItem('pm_local_usuarios');
          if (cached) {
            try { return JSON.parse(cached); } catch (e) {}
          }
          return [];
        })
      ]);

      const rawPartidos = Array.isArray(todosPartidos) ? todosPartidos : [];
      const partidosList = rawPartidos.map(p => {
        const matchId = p.partido_id || p.id;
        const localList = JSON.parse(localStorage.getItem('pm_local_partidos') || '[]');
        const localMatch = localList.find(lm => lm.id === matchId);
        return {
          id: matchId,
          equipo1: p.equipo1 || p.equipo_a || 'Local',
          equipo2: p.equipo2 || p.equipo_b || 'Visitante',
          fecha: p.fecha?.split('T')[0] || p.fecha || '',
          hora: p.fecha?.split('T')[1]?.substring(0, 5) || p.hora || '',
          fase: p.fase || 'Fase de Grupos',
          grupo: p.grupo || null,
          golesRealLocal: p.golesRealLocal !== undefined && p.golesRealLocal !== null ? p.golesRealLocal : (localMatch?.golesRealLocal !== undefined ? localMatch.golesRealLocal : null),
          golesRealVisitante: p.golesRealVisitante !== undefined && p.golesRealVisitante !== null ? p.golesRealVisitante : (localMatch?.golesRealVisitante !== undefined ? localMatch.golesRealVisitante : null),
          ganadorPenaltis: p.ganadorPenaltis || p.ganador_penaltis || localMatch?.ganadorPenaltis || null
        };
      });

      partidosList.sort((a, b) => {
        const dtA = (a.fecha || '9999-99-99') + 'T' + (a.hora || '99:99');
        const dtB = (b.fecha || '9999-99-99') + 'T' + (b.hora || '99:99');
        return dtA.localeCompare(dtB);
      });

      const rawPronosticos = Array.isArray(pronosticosCargados) ? pronosticosCargados : [];

      const pronosticosList = rawPronosticos.map(pr => {
        const gl = pr.golesLocal !== undefined ? pr.golesLocal : parseInt(pr.marcadorCombinado?.split('-')[0] || '0');
        const gv = pr.golesVisitante !== undefined ? pr.golesVisitante : parseInt(pr.marcadorCombinado?.split('-')[1] || '0');
        return {
          id: pr.id || `${pr.usuario || pr.userCedula || pr.user_id}-${pr.partidoId || pr.partido_id}`,
          partidoId: pr.partidoId || pr.partido_id,
          usuario: (pr.usuario || pr.userCedula || pr.user_id || '').toString().trim(),
          nombre: pr.nombre || pr.nombreJugador || 'Jugador',
          golesLocal: isNaN(gl) ? 0 : gl,
          golesVisitante: isNaN(gv) ? 0 : gv,
          ganadorPenaltis: pr.ganadorPenaltis || pr.ganador_penaltis || null
        };
      });

      let listUsuarios = [];
      if (Array.isArray(usuariosCargados) && usuariosCargados.length > 0) {
        listUsuarios = usuariosCargados;
      } else {
        const cached = localStorage.getItem('pm_local_usuarios');
        if (cached) {
          try { listUsuarios = JSON.parse(cached); } catch (e) {}
        }
      }

      const rawUsuarios = Array.isArray(listUsuarios) ? listUsuarios : [];
      const normalizedUsuarios = rawUsuarios.map(u => ({
        username: u.username || u.usernameUsuario || '',
        nombre: u.nombre || 'Jugador',
        rol: u.rol || 'user'
      }));

      setPartidos(partidosList);
      setTodosPronosticos(pronosticosList);
      setUsuarios(normalizedUsuarios);


      // Filtrar pronósticos para el usuario actual (usando su cédula)
      const filtrados = pronosticosList.filter(p => p.usuario.toString().trim() === user.username.toString().trim());
      setMisPronosticos(filtrados);

      // Inicializar los inputs de apuestas preservando los valores que el usuario tenga digitados
      setPronosticoInputs(prevInputs => {
        const inputsIniciales = {};
        partidosList.forEach(partido => {
          const pronosticoExistente = filtrados.find(p => p.partidoId === partido.id);
          if (pronosticoExistente) {
            inputsIniciales[partido.id] = {
              golesLocal: pronosticoExistente.golesLocal.toString(),
              golesVisitante: pronosticoExistente.golesVisitante.toString(),
              ganadorPenaltis: pronosticoExistente.ganadorPenaltis || ''
            };
          } else {
            inputsIniciales[partido.id] = {
              golesLocal: prevInputs[partido.id]?.golesLocal || '',
              golesVisitante: prevInputs[partido.id]?.golesVisitante || '',
              ganadorPenaltis: prevInputs[partido.id]?.ganadorPenaltis || ''
            };
          }
        });
        return inputsIniciales;
      });

    } catch (err) {
      setError(err.message || 'Error al cargar los datos de la polla.');
    } finally {
      setLoading(false);
    }
  };


  // Efecto para actualizar el temporizador de apuestas en tiempo real sin recargar la página (cada 30 segundos)
  useEffect(() => {
    const timer = setInterval(() => {
      // Forzar actualización de estados refrescando los partidos localmente
      setPartidos(prev => [...prev]);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, [user.username]);

  // Manejar el cambio de marcador numérico, limitando de 0 a 20 y bloqueando letras
  const handleInputChange = (partidoId, campo, valor) => {
    // Si está vacío, permitirlo temporalmente para poder escribir
    if (valor === '') {
      setPronosticoInputs(prev => ({
        ...prev,
        [partidoId]: {
          ...prev[partidoId],
          [campo]: ''
        }
      }));
      return;
    }

    // Permitir solo dígitos numéricos
    if (!/^\d+$/.test(valor)) return;

    const num = parseInt(valor);
    if (num > 20) return; // Limitar a máximo 20

    setPronosticoInputs(prev => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [campo]: valor
      }
    }));

    // Limpiar alertas
    setApuestaError(prev => ({ ...prev, [partidoId]: null }));
    setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));
  };

  const handleEnviarPronostico = async (partidoId, partido) => {
    // Validar ventana de apuestas
    const windowStatus = getBettingWindowStatus(partido.fecha, partido.hora);
    if (!windowStatus.open) {
      setApuestaError(prev => ({
        ...prev,
        [partidoId]: `La ventana de apuestas está cerrada. ${windowStatus.message}`
      }));
      return;
    }

    const seleccion = pronosticoInputs[partidoId];
    if (!seleccion || seleccion.golesLocal === '' || seleccion.golesVisitante === '') {
      setApuestaError(prev => ({
        ...prev,
        [partidoId]: "Por favor escribe un marcador válido para ambos equipos (0-20)."
      }));
      return;
    }

    const golesLocalInt = parseInt(seleccion.golesLocal);
    const golesVisitanteInt = parseInt(seleccion.golesVisitante);
    const isEmpate = golesLocalInt === golesVisitanteInt;
    const isKnockout = partido.fase !== 'Fase de Grupos';

    if (isKnockout && isEmpate && !seleccion.ganadorPenaltis) {
      setApuestaError(prev => ({
        ...prev,
        [partidoId]: "Por favor selecciona qué equipo clasifica a la siguiente ronda."
      }));
      return;
    }

    const ganadorPenaltis = (isKnockout && isEmpate) ? seleccion.ganadorPenaltis : null;

    setApuestaLoading(prev => ({ ...prev, [partidoId]: true }));
    setApuestaError(prev => ({ ...prev, [partidoId]: null }));
    setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));

    try {
      await apiRequest('/pronosticos', {
        method: 'POST',
        body: JSON.stringify({
          // Formato nuevo de backend (limpio y consistente)
          usuario: user.username,
          nombre: user.nombre,
          partidoId,
          golesLocal: golesLocalInt,
          golesVisitante: golesVisitanteInt,
          ganadorPenaltis,
          
          // Retrocompatibilidad total con Lambda antigua de AWS
          partido_id: partidoId,
          marcadorCombinado: `${seleccion.golesLocal}-${seleccion.golesVisitante}`,
          marcador_combinado: `${seleccion.golesLocal}-${seleccion.golesVisitante}`,
          userCedula: user.username,
          user_id: user.username,
          nombreJugador: user.nombre,
          ganador_penaltis: ganadorPenaltis
        })
      });

      setApuestaSuccess(prev => ({ ...prev, [partidoId]: true }));
      
      // Recargar datos actualizados
      await loadData();
      
      setTimeout(() => {
        setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));
      }, 4000);
      
    } catch (err) {
      setApuestaError(prev => ({ 
        ...prev, 
        [partidoId]: err.message || "Error al registrar pronóstico" 
      }));
    } finally {
      setApuestaLoading(prev => ({ ...prev, [partidoId]: false }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Todos los campos son obligatorios.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden.');
      return;
    }

    if (!/^\d+$/.test(newPassword)) {
      setPasswordError('La nueva contraseña debe contener solo números.');
      return;
    }

    setPasswordLoading(true);

    try {
      // 1. Validar contraseña actual
      await login(user.username, currentPassword);

      // 2. Actualizar el usuario
      const updatedUserObj = {
        ...user,
        contrasena: newPassword,
        mustChangePassword: false
      };

      await apiRequest(`/usuarios/${user.username}`, {
        method: 'PUT',
        body: JSON.stringify(updatedUserObj)
      });

      // Actualizar contexto y localstorage
      updateUser(updatedUserObj);

      // Sincronizar cache local si existe
      const localUsers = JSON.parse(localStorage.getItem('pm_local_usuarios') || '[]');
      const newLocalUsers = localUsers.map(u => u.username === user.username ? updatedUserObj : u);
      localStorage.setItem('pm_local_usuarios', JSON.stringify(newLocalUsers));

      setPasswordSuccess('Contraseña cambiada exitosamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);

    } catch (err) {
      setPasswordError(err.message || 'La contraseña actual es incorrecta o hubo un error.');
    } finally {
      setPasswordLoading(false);
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
    // Si no cargó usuarios aún, incluir al menos al usuario actual para evitar pantalla vacía
    const userList = usuarios.length > 0 ? usuarios : [{ username: user.username, nombre: user.nombre, rol: user.rol }];
    const playersOnly = userList.filter(u => u.rol !== 'admin');
    
    const leaderboard = playersOnly.map(u => {
      const userPronos = todosPronosticos.filter(p => p.usuario === u.username);
      
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
        username: u.username,
        nombre: u.nombre,
        rol: u.rol,
        puntos: totalPuntos,
        aciertosExactos,
        aciertosGanador,
        aciertosEmpate
      };
    });
    
    leaderboard.sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
    return leaderboard;
  };

  const renderUserMatchCard = (partido) => {
    const inputs = pronosticoInputs[partido.id] || { golesLocal: '', golesVisitante: '' };
    const yaPronosticado = misPronosticos.some(p => p.partidoId === partido.id);
    const pronosticoExistente = misPronosticos.find(p => p.partidoId === partido.id);
    const isLoading = apuestaLoading[partido.id];
    const matchError = apuestaError[partido.id];
    const matchSuccess = apuestaSuccess[partido.id];
    const windowStatus = getBettingWindowStatus(partido.fecha, partido.hora);

    const glInt = inputs.golesLocal !== '' ? parseInt(inputs.golesLocal) : null;
    const gvInt = inputs.golesVisitante !== '' ? parseInt(inputs.golesVisitante) : null;
    const isEmpateDigitado = glInt !== null && gvInt !== null && glInt === gvInt;
    const showPenaltisProno = partido.fase !== 'Fase de Grupos' && isEmpateDigitado;

    const noAposto = !yaPronosticado && (partido.golesRealLocal !== null || !windowStatus.open);

    let puntosMsg = null;
    let puntosColorClass = "";
    let puntosBgClass = "";
    if (partido.golesRealLocal !== null && pronosticoExistente) {
      const res = calcularPuntuacionYMensaje(partido, pronosticoExistente);
      puntosMsg = res.mensaje;
      if (res.puntos === 5) {
        puntosColorClass = "text-emerald-400 font-extrabold";
        puntosBgClass = "bg-emerald-500/10 border-emerald-500/25 shadow-lg shadow-emerald-500/5";
      } else if (res.puntos === 3) {
        puntosColorClass = "text-yellow-400 font-bold";
        puntosBgClass = "bg-yellow-500/10 border-yellow-500/25 shadow-lg shadow-yellow-500/5";
      } else if (res.puntos === 1) {
        puntosColorClass = "text-orange-400 font-bold";
        puntosBgClass = "bg-orange-500/10 border-orange-500/25 shadow-lg shadow-orange-500/5";
      } else {
        puntosColorClass = "text-rose-400 font-semibold";
        puntosBgClass = "bg-rose-500/10 border-rose-500/20";
      }
    }

    return (
      <div 
        key={partido.id} 
        className={`glass-card rounded-3xl p-6 border transition-all ${
          yaPronosticado ? 'border-gold-500/30 bg-gold-500/5' : 'border-gold-500/10'
        }`}
      >
        {/* Encabezado del partido (Fecha, hora, alertas) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-gray-400 pb-4 border-b border-brand-blue-800/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-brand-blue-600" />
              {partido.fecha}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-brand-blue-600" />
              {partido.hora}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {yaPronosticado && (
              <span className="bg-gold-500/10 text-gold-500 border border-gold-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                Tu Apuesta Registrada
              </span>
            )}
            {partido.golesRealLocal !== null && (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                Terminado: {partido.golesRealLocal} - {partido.golesRealVisitante}
              </span>
            )}
            {partido.golesRealLocal === null && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                windowStatus.open 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}>
                {windowStatus.open ? <Unlock size={12} /> : <Lock size={12} />}
                {windowStatus.message}
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo del Partido: Equipos e Inputs */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full md:max-w-2xl gap-6">
            
            {/* Local Team Container */}
            <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center w-full sm:w-auto sm:flex-1 gap-4 sm:gap-3">
              <div className="flex items-center sm:flex-col gap-3 sm:gap-2">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-brand-blue-800/40 shrink-0 bg-brand-blue-950 flex items-center justify-center">
                  {getCountryFlagUrl(partido.equipo1) ? (
                    <img src={getCountryFlagUrl(partido.equipo1)} alt={partido.equipo1} className="w-full h-full object-cover scale-110" />
                  ) : (
                    <span className="text-xs font-bold">{partido.equipo1.substring(0, 2)}</span>
                  )}
                </div>
                <span className="font-bold text-white text-base md:text-lg tracking-wide">{partido.equipo1}</span>
              </div>
              
              {/* Input de Goles Local debajo del país */}
              <input
                type="text"
                value={inputs.golesLocal}
                onChange={(e) => handleInputChange(partido.id, 'golesLocal', e.target.value)}
                placeholder="0"
                disabled={partido.golesRealLocal !== null || !windowStatus.open || yaPronosticado}
                className="w-16 bg-brand-blue-900 border border-gold-500/20 text-gold-500 rounded-xl py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-gold-500 font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              />
            </div>

            {/* VS Separator */}
            <div className="flex sm:flex-col items-center justify-center shrink-0 py-2">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-brand-blue-800 text-brand-blue-400 uppercase tracking-wider">VS</span>
              <span className="hidden sm:inline text-xl font-bold text-gold-500/50 mt-4">-</span>
            </div>

            {/* Visitante Team Container */}
            <div className="flex flex-row-reverse sm:flex-col items-center justify-between sm:justify-center w-full sm:w-auto sm:flex-1 gap-4 sm:gap-3">
              <div className="flex flex-row-reverse sm:flex-col items-center gap-3 sm:gap-2">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-brand-blue-800/40 shrink-0 bg-brand-blue-950 flex items-center justify-center">
                  {getCountryFlagUrl(partido.equipo2) ? (
                    <img src={getCountryFlagUrl(partido.equipo2)} alt={partido.equipo2} className="w-full h-full object-cover scale-110" />
                  ) : (
                    <span className="text-xs font-bold">{partido.equipo2.substring(0, 2)}</span>
                  )}
                </div>
                <span className="font-bold text-white text-base md:text-lg tracking-wide">{partido.equipo2}</span>
              </div>
              
              {/* Input de Goles Visitante debajo del país */}
              <input
                type="text"
                value={inputs.golesVisitante}
                onChange={(e) => handleInputChange(partido.id, 'golesVisitante', e.target.value)}
                placeholder="0"
                disabled={partido.golesRealLocal !== null || !windowStatus.open || yaPronosticado}
                className="w-16 bg-brand-blue-900 border border-gold-500/20 text-gold-500 rounded-xl py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-gold-500 font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              />
            </div>

          </div>

          {/* Botón para enviar */}
          <div className="w-full md:w-auto flex justify-center items-center">
            <button
              onClick={() => handleEnviarPronostico(partido.id, partido)}
              disabled={isLoading || partido.golesRealLocal !== null || !windowStatus.open || yaPronosticado || (showPenaltisProno && !inputs.ganadorPenaltis)}
              className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                yaPronosticado 
                  ? "bg-brand-blue-800/80 text-emerald-400 border border-emerald-500/20 cursor-default" 
                  : "bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 shadow-lg shadow-gold-500/10"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span>{isLoading ? "Guardando..." : yaPronosticado ? "Pronóstico Guardado" : "Guardar Pronóstico"}</span>
            </button>
          </div>
        </div>

        {/* Selector de Penaltis / Clasificado interactivo */}
        {showPenaltisProno && !yaPronosticado && (
          <div className="mt-4 p-3 rounded-2xl bg-brand-blue-950 border border-gold-500/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gold-500 font-bold flex items-center gap-1">
              🤔 Empate en eliminatoria. Selecciona quién clasifica:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPronosticoInputs({
                  ...pronosticoInputs,
                  [partido.id]: { ...inputs, ganadorPenaltis: partido.equipo1 }
                })}
                className={`px-3.5 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                  inputs.ganadorPenaltis === partido.equipo1
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-brand-blue-900 border-brand-blue-800 text-gray-400 hover:text-white'
                }`}
              >
                {renderFlag(partido.equipo1)}
                <span>{partido.equipo1}</span>
              </button>
              <button
                type="button"
                onClick={() => setPronosticoInputs({
                  ...pronosticoInputs,
                  [partido.id]: { ...inputs, ganadorPenaltis: partido.equipo2 }
                })}
                className={`px-3.5 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                  inputs.ganadorPenaltis === partido.equipo2
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-brand-blue-900 border-brand-blue-800 text-gray-400 hover:text-white'
                }`}
              >
                {renderFlag(partido.equipo2)}
                <span>{partido.equipo2}</span>
              </button>
            </div>
          </div>
        )}

        {yaPronosticado && pronosticoExistente && pronosticoExistente.golesLocal === pronosticoExistente.golesVisitante && partido.fase !== 'Fase de Grupos' && (
          <div className="mt-4 text-center text-xs text-gold-500/90 bg-gold-500/5 py-2 px-3 border border-gold-500/10 rounded-xl font-semibold flex items-center justify-center gap-1.5">
            <span>🔮 Pronosticaste que clasifica:</span>
            {renderFlag(pronosticoExistente.ganadorPenaltis)}
            <span className="underline font-bold text-white">{pronosticoExistente.ganadorPenaltis || 'No seleccionado'}</span>
          </div>
        )}

        {partido.golesRealLocal !== null && partido.golesRealLocal === partido.golesRealVisitante && partido.fase !== 'Fase de Grupos' && partido.ganadorPenaltis && (
          <div className="mt-2 text-center text-xs text-emerald-400 bg-emerald-500/5 py-2 px-3 border border-emerald-500/10 rounded-xl font-semibold flex items-center justify-center gap-1.5">
            <span>🏆 Clasificó Oficialmente:</span>
            {renderFlag(partido.ganadorPenaltis)}
            <span className="underline font-extrabold text-white">{partido.ganadorPenaltis}</span>
          </div>
        )}

        {/* Mensajes de feedback */}
        {matchSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={14} />
            <span>¡Tu marcador ha sido guardado de forma exitosa!</span>
          </div>
        )}
        {matchError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{matchError}</span>
          </div>
        )}
        {noAposto && (
          <div className="mt-4 p-3.5 rounded-2xl border text-xs text-center flex items-center justify-center gap-2 bg-rose-500/10 border-rose-500/20 text-rose-400 font-extrabold uppercase tracking-wider transition-all">
            <AlertCircle size={14} className="animate-pulse" />
            <span>No registraste ninguna apuesta</span>
          </div>
        )}
        {puntosMsg && (
          <div className={`mt-4 p-3.5 rounded-2xl border text-xs text-center flex items-center justify-center gap-2 ${puntosBgClass} ${puntosColorClass} transition-all`}>
            <Trophy size={14} className="animate-pulse" />
            <span>{puntosMsg}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-gray-400 animate-pulse flex flex-col items-center justify-center gap-4">
        <RefreshCw size={36} className="animate-spin text-gold-500" />
        <p className="text-lg">Cargando la Polla Mundialista... ¡Prepara tus pronósticos!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4 text-center">
        <div className="glass-card rounded-2xl p-6 border border-rose-500/20 text-rose-300 flex flex-col items-center gap-3">
          <AlertCircle size={32} />
          <p className="font-semibold">{error}</p>
          <button 
            onClick={loadData} 
            className="px-4 py-2 bg-brand-blue-800 hover:bg-brand-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw size={14} />
            <span>Reintentar Conexión</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8 space-y-12 animate-fade-in pb-16">
      
      {/* SECCIÓN 1: MIS PRONÓSTICOS */}
      {activeSection === 'mis-pronosticos' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Mis Pronósticos ({misPronosticos.length})</h2>
              <p className="text-sm text-gray-400">Tus marcadores registrados para el gran premio.</p>
            </div>
            <button 
              onClick={loadData}
              className="p-2 bg-brand-blue-900 border border-brand-blue-800 hover:bg-brand-blue-800 text-gray-300 hover:text-white rounded-lg transition-all active:scale-95"
              title="Actualizar todo"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {misPronosticos.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-dashed border-gold-500/20 text-center text-gray-400">
              Aún no has registrado ningún pronóstico. ¡Utiliza la sección de abajo para apostar!
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filtro de Fases para Mis Pronósticos */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-blue-900/20 border border-brand-blue-800/40 p-4 rounded-xl">
                <span className="text-xs font-bold uppercase text-brand-blue-400">Filtrar por Fase del Torneo:</span>
                <select
                  value={faseFilterUser}
                  onChange={(e) => setFaseFilterUser(e.target.value)}
                  className="bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                >
                  <option value="Todos">Ver Todas las Fases</option>
                  <option value="Fase de Grupos">Fase de Grupos</option>
                  <option value="Dieciseisavos">Dieciseisavos</option>
                  <option value="Octavos">Octavos de Final</option>
                  <option value="Cuartos">Cuartos de Final</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Final">Final</option>
                </select>
              </div>

              {['Fase de Grupos', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Final']
                .filter(fase => faseFilterUser === 'Todos' || faseFilterUser === fase)
                .map((fase) => {
                  const pronosFase = misPronosticos.filter(pr => {
                    const match = partidos.find(p => p.id === pr.partidoId) || {};
                    return match.fase === fase;
                  }).sort((a, b) => {
                    const matchA = partidos.find(p => p.id === a.partidoId) || {};
                    const matchB = partidos.find(p => p.id === b.partidoId) || {};
                    const dtA = (matchA.fecha || '9999-99-99') + 'T' + (matchA.hora || '99:99');
                    const dtB = (matchB.fecha || '9999-99-99') + 'T' + (matchB.hora || '99:99');
                    return dtA.localeCompare(dtB);
                  });

                  if (pronosFase.length === 0) return null;

                  return (
                    <div key={fase} className="p-5 rounded-2xl bg-brand-blue-900/10 border border-brand-blue-800/40 space-y-4">
                      <h3 className="text-sm font-black text-gold-500 tracking-wider uppercase border-b border-brand-blue-800/40 pb-2">{fase}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pronosFase.map((pronostico) => {
                          const partidoOriginal = partidos.find(p => p.id === pronostico.partidoId) || {};
                          const tieneMarcadorReal = partidoOriginal.golesRealLocal !== null && partidoOriginal.golesRealVisitante !== null;
                          let statusText = 'Pronóstico Guardado';
                          let statusColorClass = 'text-gold-500';
                          let borderColorClass = 'border-l-gold-500';
                          let badgeColorClass = 'bg-gold-500/10 text-gold-500 border-gold-500/20';
                          
                          if (tieneMarcadorReal) {
                            const res = calcularPuntuacionYMensaje(partidoOriginal, pronostico);
                            statusText = res.mensaje;
                            if (res.puntos === 5) {
                              statusColorClass = 'text-emerald-400 font-extrabold';
                              borderColorClass = 'border-l-emerald-500 shadow-lg shadow-emerald-500/10';
                              badgeColorClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
                            } else if (res.puntos === 3) {
                              statusColorClass = 'text-yellow-400 font-bold';
                              borderColorClass = 'border-l-yellow-500 shadow-lg shadow-yellow-500/5';
                              badgeColorClass = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
                            } else if (res.puntos === 1) {
                              statusColorClass = 'text-orange-400 font-bold';
                              borderColorClass = 'border-l-orange-500 shadow-lg shadow-orange-500/5';
                              badgeColorClass = 'bg-orange-500/15 text-orange-400 border-orange-500/20';
                            } else {
                              statusColorClass = 'text-rose-400 font-semibold';
                              borderColorClass = 'border-l-rose-500 shadow-lg shadow-rose-500/5';
                              badgeColorClass = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                            }
                          }

                          return (
                            <div 
                              key={pronostico.id} 
                              className={`glass-card rounded-2xl p-4 border-l-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-blue-900/20 hover:brightness-105 transition-all ${borderColorClass}`}
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] uppercase tracking-wider ${statusColorClass}`}>
                                    {statusText}
                                  </span>
                                </div>
                                <p className="text-base font-semibold text-white flex items-center gap-1.5">
                                  {renderFlag(partidoOriginal.equipo1)}
                                  <span>{partidoOriginal.equipo1 || 'Local'}</span>
                                  <span className="text-xs text-gold-500 font-bold">vs</span>
                                  {renderFlag(partidoOriginal.equipo2)}
                                  <span>{partidoOriginal.equipo2 || 'Visitante'}</span>
                                </p>
                                {tieneMarcadorReal && (
                                   <div className="text-xs text-gray-400 mt-1.5 space-y-1">
                                     <p>
                                       Resultado real: <span className="font-extrabold text-white bg-brand-blue-900 px-2 py-0.5 rounded border border-brand-blue-800">{partidoOriginal.golesRealLocal} - {partidoOriginal.golesRealVisitante}</span>
                                     </p>
                                     {partidoOriginal.fase !== 'Fase de Grupos' && partidoOriginal.golesRealLocal === partidoOriginal.golesRealVisitante && partidoOriginal.ganadorPenaltis && (
                                       <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1.5 mt-1 bg-emerald-500/5 py-1 px-2.5 rounded-lg border border-emerald-500/10 w-fit">
                                         <span>🏆 Clasificó Oficialmente:</span>
                                         {renderFlag(partidoOriginal.ganadorPenaltis)}
                                         <span className="underline">{partidoOriginal.ganadorPenaltis}</span>
                                       </p>
                                     )}
                                   </div>
                                 )}
                                 {partidoOriginal.fase !== 'Fase de Grupos' && pronostico.golesLocal === pronostico.golesVisitante && (
                                   <p className="text-[10px] text-gold-500 font-semibold mt-1 flex items-center gap-1.5 bg-gold-500/5 py-1 px-2.5 rounded-lg border border-gold-500/10 w-fit">
                                     <span>🔮 Tu Clasificado Pronosticado:</span>
                                     {renderFlag(pronostico.ganadorPenaltis)}
                                     <span className="text-white underline">{pronostico.ganadorPenaltis || 'No seleccionado'}</span>
                                   </p>
                                 )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className={`font-extrabold text-lg px-4 py-2 rounded-xl border ${badgeColorClass}`}>
                                  {pronostico.golesLocal} - {pronostico.golesVisitante}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: PESTAÑAS DE FASES DE PARTIDOS (PARA PRONÓSTICOS) */}
      {activeSection.startsWith('fase-') && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">{getPhaseName(activeSection)}</h2>
              <div className="text-sm text-gray-400 mt-1">
                Pronostica los marcadores de los partidos en juego.
                <div className="mt-3 bg-brand-blue-900/30 border border-gold-500/25 rounded-2xl p-4 text-xs text-gray-300 space-y-2">
                  <div className="text-gold-500 font-black uppercase tracking-wider flex items-center gap-1.5 mb-1 text-[11px]">
                    <Trophy size={13} className="text-gold-500 animate-bounce" />
                    <span>Sistema Oficial de Puntuación de la Polla</span>
                  </div>
                  {activeSection === 'fase-grupos' ? (
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 list-disc pl-4">
                      <li><strong className="text-white">Marcador Exacto:</strong> <span className="text-emerald-400 font-bold">+5 puntos</span> por acertar el resultado exacto.</li>
                      <li><strong className="text-white">Ganador/Empate sin marcador exacto:</strong> <span className="text-yellow-400 font-bold">+3 puntos</span> por acertar ganador o empate en fase de grupos sin marcador exacto.</li>
                      <li><strong className="text-white">No acertó nada:</strong> <span className="text-rose-400 font-bold">+0 puntos</span> por no acertar nada.</li>
                    </ul>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 list-disc pl-4">
                      <li><strong className="text-white">Marcador Exacto:</strong> <span className="text-emerald-400 font-bold">+5 puntos</span> por acertar el resultado exacto.</li>
                      <li><strong className="text-white">Exacto + Clasificado (Eliminatorias):</strong> <span className="text-emerald-400 font-bold">+5 puntos</span> por acertar empate con marcador exacto y al clasificado por penaltis.</li>
                      <li><strong className="text-white">Exacto sin Clasificado (Eliminatorias):</strong> <span className="text-yellow-400 font-bold">+3 puntos</span> por acertar empate exacto pero fallar el clasificado.</li>
                      <li><strong className="text-white">Empate + Clasificado (Eliminatorias):</strong> <span className="text-yellow-400 font-bold">+3 puntos</span> por acertar empate no exacto pero sí al clasificado.</li>
                      <li><strong className="text-white">Empate sin Clasificado (Eliminatorias):</strong> <span className="text-orange-400 font-bold">+1 punto</span> por acertar empate no exacto y fallar al clasificado.</li>
                      <li><strong className="text-white">No acertó nada:</strong> <span className="text-rose-400 font-bold">+0 puntos</span> por no acertar nada.</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={loadData}
              className="p-2 bg-brand-blue-900 border border-brand-blue-800 hover:bg-brand-blue-800 text-gray-300 hover:text-white rounded-lg transition-all active:scale-95"
              title="Actualizar partidos"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {partidos.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
              No hay partidos activos en este momento.
            </div>
          ) : activeSection === 'fase-grupos' ? (
            // Fase de Grupos organizada de Grupo A a L
            <div className="space-y-8">
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

              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
                .filter(grp => selectedGroupFilter === 'Todos' || selectedGroupFilter === grp)
                .map((grp) => {
                const partidosGrupo = partidos.filter(p => p.fase === 'Fase de Grupos' && p.grupo === grp);
                
                return (
                  <div key={grp} className="space-y-4">
                    <h3 className="text-lg font-black text-gold-500 tracking-wider uppercase border-b border-brand-blue-800/40 pb-2">Grupo {grp}</h3>
                    {partidosGrupo.length === 0 ? (
                      <p className="text-xs text-gray-500 italic pl-2">No hay partidos programados para este grupo aún.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {partidosGrupo.map((partido) => renderUserMatchCard(partido))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Otras Fases: Lista plana de partidos
            (() => {
              const faseName = getPhaseName(activeSection);
              const partidosFase = partidos.filter(p => p.fase === faseName);
              
              if (partidosFase.length === 0) {
                return (
                  <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
                    No hay partidos programados para esta fase en este momento.
                  </div>
                );
              }
              
              return (
                <div className="grid grid-cols-1 gap-6">
                  {partidosFase.map((partido) => renderUserMatchCard(partido))}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* SECCIÓN 3: TABLA DE PUNTUACIÓN GLOBAL */}
      {activeSection === 'puntuacion' && (
        <div className="glass-card rounded-2xl p-6 border border-gold-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black gold-gradient-text tracking-wide">Tabla de Puntuaciones</h3>
              <p className="text-xs text-gray-400">Tabla de clasificación oficial en tiempo real de todos los participantes.</p>
            </div>
            <button 
              onClick={loadData}
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
                  const isCurrentUser = row.username === user.username;
                  
                  return (
                    <tr key={row.username} className={`border-b border-brand-blue-800/40 hover:bg-brand-blue-800/10 transition-colors ${
                      isTop1 ? 'bg-gold-500/5' : ''
                    } ${isCurrentUser ? 'bg-brand-blue-900/20 border-l-4 border-l-gold-500' : ''}`}>
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
                      <td className="py-3 px-4 text-white font-bold">
                        {row.nombre} {isCurrentUser && <span className="text-[9px] uppercase tracking-wider font-extrabold text-gold-500 bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/20 ml-2">Tú</span>}
                      </td>
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

      {/* SECCIÓN 4: CAMBIAR CONTRASEÑA */}
      {activeSection === 'cambiar-password' && (
        <div className="max-w-md mx-auto glass-card rounded-2xl p-6 md:p-8 border border-gold-500/10 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black gold-gradient-text tracking-wide mb-2">Cambiar Contraseña</h3>
            <p className="text-xs text-gray-400">Actualiza tu contraseña. Usa solo números.</p>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={14} />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Contraseña Actual</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full bg-[#090d16] border border-gold-500/10 text-white rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gold-500 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Nueva Contraseña (Solo números)</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) setNewPassword(val);
                  }}
                  placeholder="Ej: 12345"
                  className="w-full bg-[#090d16] border border-gold-500/10 text-white rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gold-500 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-brand-blue-600 mb-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) setConfirmPassword(val);
                  }}
                  placeholder="Repite la nueva contraseña"
                  className="w-full bg-[#090d16] border border-gold-500/10 text-white rounded-xl py-3 pl-4 pr-10 text-sm focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 transition-all"
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
              disabled={passwordLoading}
              className="w-full py-3.5 mt-2 rounded-xl font-extrabold bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock size={16} />
              <span>{passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
