import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
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
  UserSquare2 
} from 'lucide-react';

export default function UserView({ activeSection }) {
  const { user } = useAuth();
  
  // Datos
  const [partidos, setPartidos] = useState([]);
  const [todosPronosticos, setTodosPronosticos] = useState([]);
  const [misPronosticos, setMisPronosticos] = useState([]);
  
  // Estados de carga e interacción
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selección temporal de marcador por partidoId
  // { [partidoId]: { golesLocal: '', golesVisitante: '' } }
  const [pronosticoInputs, setPronosticoInputs] = useState({});
  const [apuestaLoading, setApuestaLoading] = useState({});
  const [apuestaError, setApuestaError] = useState({});
  const [apuestaSuccess, setApuestaSuccess] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [todosPartidos, pronosticosCargados] = await Promise.all([
        apiRequest('/partidos'),
        apiRequest('/pronosticos')
      ]);

      const rawPartidos = Array.isArray(todosPartidos) ? todosPartidos : [];
      const partidosList = rawPartidos.map(p => ({
        id: p.partido_id || p.id,
        equipo1: p.equipo1 || p.equipo_a || 'Local',
        equipo2: p.equipo2 || p.equipo_b || 'Visitante',
        fecha: p.fecha?.split('T')[0] || p.fecha || '',
        hora: p.fecha?.split('T')[1]?.substring(0, 5) || p.hora || '',
        golesRealLocal: p.golesRealLocal !== undefined ? p.golesRealLocal : null,
        golesRealVisitante: p.golesRealVisitante !== undefined ? p.golesRealVisitante : null
      }));
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
          golesVisitante: isNaN(gv) ? 0 : gv
        };
      });

      setPartidos(partidosList);
      setTodosPronosticos(pronosticosList);


      // Filtrar pronósticos para el usuario actual (usando su cédula)
      const filtrados = pronosticosList.filter(p => p.usuario === user.username.toString().trim());
      setMisPronosticos(filtrados);

      // Inicializar los inputs de apuestas preservando los valores que el usuario tenga digitados
      setPronosticoInputs(prevInputs => {
        const inputsIniciales = {};
        partidosList.forEach(partido => {
          const pronosticoExistente = filtrados.find(p => p.partidoId === partido.id);
          if (pronosticoExistente) {
            inputsIniciales[partido.id] = {
              golesLocal: pronosticoExistente.golesLocal.toString(),
              golesVisitante: pronosticoExistente.golesVisitante.toString()
            };
          } else {
            inputsIniciales[partido.id] = {
              golesLocal: prevInputs[partido.id]?.golesLocal || '',
              golesVisitante: prevInputs[partido.id]?.golesVisitante || ''
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
          golesLocal: parseInt(seleccion.golesLocal),
          golesVisitante: parseInt(seleccion.golesVisitante),
          
          // Retrocompatibilidad total con Lambda antigua de AWS
          partido_id: partidoId,
          marcadorCombinado: `${seleccion.golesLocal}-${seleccion.golesVisitante}`,
          marcador_combinado: `${seleccion.golesLocal}-${seleccion.golesVisitante}`,
          userCedula: user.username,
          user_id: user.username,
          nombreJugador: user.nombre
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

  // Renderizar bandera del país
  const renderFlag = (teamName) => {
    const flagUrl = getCountryFlagUrl(teamName);
    if (flagUrl) {
      return <img src={flagUrl} alt={teamName} className="h-6 w-6 rounded-full object-cover aspect-square shadow-sm inline-block mr-2" />;
    }
    return null;
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {misPronosticos.map((pronostico) => {
                const partidoOriginal = partidos.find(p => p.id === pronostico.partidoId) || {};
                const tieneMarcadorReal = partidoOriginal.golesRealLocal !== null && partidoOriginal.golesRealVisitante !== null;
                const esGanador = tieneMarcadorReal && pronostico.golesLocal === partidoOriginal.golesRealLocal && pronostico.golesVisitante === partidoOriginal.golesRealVisitante;

                return (
                  <div 
                    key={pronostico.id} 
                    className={`glass-card rounded-2xl p-4 border-l-4 flex justify-between items-center bg-brand-blue-900/20 hover:brightness-105 transition-all ${
                      tieneMarcadorReal
                        ? esGanador 
                          ? 'border-l-emerald-500 shadow-lg shadow-emerald-500/10' 
                          : 'border-l-rose-500 shadow-lg shadow-rose-500/5'
                        : 'border-l-gold-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          tieneMarcadorReal 
                            ? esGanador 
                              ? 'text-emerald-400' 
                              : 'text-rose-400' 
                            : 'text-gold-500'
                        }`}>
                          {tieneMarcadorReal ? (esGanador ? '¡Acertaste al marcador!' : 'Tu marcador falló') : 'Pronóstico Guardado'}
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
                        <p className="text-xs text-gray-400 mt-1">
                          Resultado real: <span className="font-bold text-white">{partidoOriginal.golesRealLocal} - {partidoOriginal.golesRealVisitante}</span>
                        </p>
                      )}
                    </div>
                    <div className={`font-extrabold text-lg px-4 py-2 rounded-xl border ${
                      tieneMarcadorReal
                        ? esGanador 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        : 'bg-gold-500/10 text-gold-500 border-gold-500/20'
                    }`}>
                      {pronostico.golesLocal} - {pronostico.golesVisitante}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: PARTIDOS ACTIVOS Y APOSTAR */}
      {(activeSection === 'partidos' || !activeSection) && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 tracking-wide">Partidos Activos y Apuestas de Amigos</h2>
          <p className="text-sm text-gray-400 mb-6">
            Escribe tu marcador (máximo 20 goles). Las apuestas se habilitan 2 horas antes de que inicie el partido y se cierran 10 minutos antes.
          </p>

          {partidos.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
              No hay partidos activos en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {partidos.map((partido) => {
                const inputs = pronosticoInputs[partido.id] || { golesLocal: '', golesVisitante: '' };
                const yaPronosticado = misPronosticos.some(p => p.partidoId === partido.id);
                const isLoading = apuestaLoading[partido.id];
                const matchError = apuestaError[partido.id];
                const matchSuccess = apuestaSuccess[partido.id];

                // Validar ventana de apuestas
                const windowStatus = getBettingWindowStatus(partido.fecha, partido.hora);

                // Pronósticos de OTROS usuarios para este partido
                const otrosPronosticos = todosPronosticos.filter(
                  p => p.partidoId === partido.id && p.usuario !== user.username
                );

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
                      <div className="flex items-center justify-between w-full md:max-w-2xl gap-4">
                        
                        {/* Local Team Container */}
                        <div className="flex flex-col items-center flex-1 text-center space-y-3">
                          <div className="flex flex-col items-center gap-2">
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
                          <div className="flex flex-col items-center">
                            <input
                              type="text"
                              value={inputs.golesLocal}
                              onChange={(e) => handleInputChange(partido.id, 'golesLocal', e.target.value)}
                              placeholder="0"
                              disabled={partido.golesRealLocal !== null || !windowStatus.open || yaPronosticado}
                              className="w-16 bg-brand-blue-900 border border-gold-500/20 text-gold-500 rounded-xl py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-gold-500 font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            />
                            <span className="text-[9px] uppercase text-gray-500 mt-1 font-bold tracking-wider">Local</span>
                          </div>
                        </div>

                        {/* VS Separator */}
                        <div className="flex flex-col items-center shrink-0 px-2 self-start pt-2">
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-brand-blue-800 text-brand-blue-400 uppercase tracking-wider">VS</span>
                          <span className="text-xl font-bold text-gold-500/50 mt-4">-</span>
                        </div>

                        {/* Visitante Team Container */}
                        <div className="flex flex-col items-center flex-1 text-center space-y-3">
                          <div className="flex flex-col items-center gap-2">
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
                          <div className="flex flex-col items-center">
                            <input
                              type="text"
                              value={inputs.golesVisitante}
                              onChange={(e) => handleInputChange(partido.id, 'golesVisitante', e.target.value)}
                              placeholder="0"
                              disabled={partido.golesRealLocal !== null || !windowStatus.open || yaPronosticado}
                              className="w-16 bg-brand-blue-900 border border-gold-500/20 text-gold-500 rounded-xl py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-gold-500 font-extrabold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            />
                            <span className="text-[9px] uppercase text-gray-500 mt-1 font-bold tracking-wider">Visitante</span>
                          </div>
                        </div>

                      </div>

                      {/* Botón para enviar */}
                      <div className="w-full md:w-auto flex justify-center items-center">
                        <button
                          onClick={() => handleEnviarPronostico(partido.id, partido)}
                          disabled={isLoading || partido.golesRealLocal !== null || !windowStatus.open || yaPronosticado}
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

                    {/* SUB-SECCIÓN: PRONÓSTICOS DE OTROS AMIGOS PARA ESTE PARTIDO */}
                    <div className="mt-6 pt-4 border-t border-brand-blue-800/80">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-2">
                        Apuestas de tus amigos ({otrosPronosticos.length}):
                      </p>
                      {otrosPronosticos.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Ningún amigo ha apostado aún. ¡Sé el primero!</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {otrosPronosticos.map((p) => (
                            <div 
                              key={p.id} 
                              className="bg-brand-blue-950/60 border border-brand-blue-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 flex items-center gap-2"
                            >
                              <span className="font-bold text-white">{p.nombre || p.usuario}</span>
                              <span className="bg-gold-500/15 text-gold-500 border border-gold-500/25 px-1.5 py-0.5 rounded font-extrabold text-[10px]">
                                {p.golesLocal} - {p.golesVisitante}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
