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
  Unlock
} from 'lucide-react';

// ─── Helpers de localStorage ────────────────────────────────────────────────

const getLocalPartidos = () => {
  try {
    const raw = localStorage.getItem('pm_local_partidos');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const getLocalPronosticos = () => {
  try {
    const raw = localStorage.getItem('pm_local_pronosticos');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveLocalPronosticos = (list) => {
  localStorage.setItem('pm_local_pronosticos', JSON.stringify(list));
};

// ─── Normalizar un pronóstico de AWS al formato local ───────────────────────
const normalizePron = (p) => ({
  id:                p.id || `${p.partido_id || p.partidoId}-${p.user_id || p.usuario}`,
  partidoId:         p.partido_id || p.partidoId,
  usuario:           p.user_id    || p.usuario   || p.userCedula,
  nombre:            p.nombreJugador || p.nombre  || 'Jugador',
  golesLocal:        p.golesLocal    !== undefined ? p.golesLocal    : parseInt((p.marcadorCombinado || p.marcador_combinado || '0-0').split('-')[0]),
  golesVisitante:    p.golesVisitante !== undefined ? p.golesVisitante : parseInt((p.marcadorCombinado || p.marcador_combinado || '0-0').split('-')[1]),
  marcadorCombinado: p.marcadorCombinado || p.marcador_combinado || `${p.golesLocal}-${p.golesVisitante}`,
});

// ─── Componente ─────────────────────────────────────────────────────────────

export default function UserView({ activeSection }) {
  const { user } = useAuth();
  
  const [partidos, setPartidos]               = useState([]);
  const [todosPronosticos, setTodosPronosticos] = useState([]);
  const [misPronosticos, setMisPronosticos]   = useState([]);
  
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  
  // Inputs temporales de marcador { [partidoId]: { golesLocal, golesVisitante } }
  const [pronosticoInputs, setPronosticoInputs] = useState({});
  const [apuestaLoading, setApuestaLoading]     = useState({});
  const [apuestaError, setApuestaError]         = useState({});
  const [apuestaSuccess, setApuestaSuccess]     = useState({});

  // ── Cargar datos ────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    setError(null);

    // Siempre cargar lo local primero para tener datos inmediatos
    let partidosList   = getLocalPartidos();
    let pronosticosList = getLocalPronosticos();

    try {
      const [resPartidos, resPronos] = await Promise.all([
        apiRequest('/partidos'),
        apiRequest('/pronosticos')
      ]);

      // Normalizar partidos de AWS
      const awsPartidos = (() => {
        if (Array.isArray(resPartidos)) return resPartidos;
        if (resPartidos && Array.isArray(resPartidos.partidos)) {
          return resPartidos.partidos.map(p => ({
            id:               p.partido_id || p.id,
            equipo1:          p.equipo_a   || p.equipo1,
            equipo2:          p.equipo_b   || p.equipo2,
            fecha:            p.fecha?.split('T')[0] || p.fecha || '',
            hora:             p.fecha?.split('T')[1]?.substring(0, 5) || p.hora || '',
            golesRealLocal:    p.golesRealLocal    ?? null,
            golesRealVisitante:p.golesRealVisitante ?? null,
          }));
        }
        return [];
      })();
      if (awsPartidos.length > 0) {
        partidosList = awsPartidos;
        localStorage.setItem('pm_local_partidos', JSON.stringify(awsPartidos));
      }

      // Normalizar pronósticos de AWS
      const awsPronos = (() => {
        if (Array.isArray(resPronos)) return resPronos.map(normalizePron);
        if (resPronos && Array.isArray(resPronos.pronosticos)) return resPronos.pronosticos.map(normalizePron);
        return [];
      })();

      // Combinar pronósticos (locales + AWS, sin duplicados por partido+usuario)
      const localPronos = getLocalPronosticos();
      const combinedMap = new Map();
      localPronos.forEach(p  => combinedMap.set(`${p.partidoId}-${p.usuario}`, p));
      awsPronos.forEach(p    => {
        const key = `${p.partidoId}-${p.usuario}`;
        if (!combinedMap.has(key)) combinedMap.set(key, p);
      });
      pronosticosList = Array.from(combinedMap.values());
      saveLocalPronosticos(pronosticosList);

    } catch (err) {
      console.warn('Fallo al cargar desde AWS, usando localStorage:', err.message);
    }

    setPartidos(partidosList);
    setTodosPronosticos(pronosticosList);

    const filtrados = pronosticosList.filter(p => p.usuario === user.username);
    setMisPronosticos(filtrados);

    // Inicializar inputs de apuesta
    const inputs = {};
    partidosList.forEach(partido => {
      const prev = filtrados.find(p => p.partidoId === partido.id);
      inputs[partido.id] = prev
        ? { golesLocal: String(prev.golesLocal), golesVisitante: String(prev.golesVisitante) }
        : { golesLocal: '', golesVisitante: '' };
    });
    setPronosticoInputs(inputs);
    setLoading(false);
  };

  // Refrescar cada 30 segundos el timer de apuestas (sin recargar de red)
  useEffect(() => {
    const timer = setInterval(() => setPartidos(prev => [...prev]), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { loadData(); }, [user.username]);

  // ── Controles de input ──────────────────────────────────────────────────

  const handleInputChange = (partidoId, campo, valor) => {
    if (valor === '') {
      setPronosticoInputs(prev => ({ ...prev, [partidoId]: { ...prev[partidoId], [campo]: '' } }));
      return;
    }
    if (!/^\d+$/.test(valor)) return;
    const num = parseInt(valor);
    if (num > 20) return;
    setPronosticoInputs(prev => ({ ...prev, [partidoId]: { ...prev[partidoId], [campo]: valor } }));
    setApuestaError(prev   => ({ ...prev, [partidoId]: null }));
    setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));
  };

  // ── Enviar pronóstico ───────────────────────────────────────────────────

  const handleEnviarPronostico = async (partidoId, partido) => {
    // Solo un pronóstico por partido — si ya apostó, bloquear
    const yaApostado = misPronosticos.some(p => p.partidoId === partidoId);
    if (yaApostado) return;

    const windowStatus = getBettingWindowStatus(partido.fecha, partido.hora);
    if (!windowStatus.open) {
      setApuestaError(prev => ({ ...prev, [partidoId]: `La ventana de apuestas está cerrada. ${windowStatus.message}` }));
      return;
    }

    const sel = pronosticoInputs[partidoId];
    if (!sel || sel.golesLocal === '' || sel.golesVisitante === '') {
      setApuestaError(prev => ({ ...prev, [partidoId]: 'Por favor escribe un marcador válido para ambos equipos (0-20).' }));
      return;
    }

    setApuestaLoading(prev => ({ ...prev, [partidoId]: true }));
    setApuestaError(prev   => ({ ...prev, [partidoId]: null }));
    setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));

    const nuevoProno = {
      id:               `${partidoId}-${user.username}`,
      partidoId,
      usuario:          user.username,
      nombre:           user.nombre,
      golesLocal:       parseInt(sel.golesLocal),
      golesVisitante:   parseInt(sel.golesVisitante),
      marcadorCombinado:`${sel.golesLocal}-${sel.golesVisitante}`,
    };

    // 1. Guardar localmente primero (siempre)
    const localList = getLocalPronosticos();
    const exists = localList.some(p => p.partidoId === partidoId && p.usuario === user.username);
    if (!exists) {
      const updated = [...localList, nuevoProno];
      saveLocalPronosticos(updated);
    }

    // 2. Intentar enviar a AWS (en paralelo, sin bloquear UX)
    try {
      await apiRequest('/pronosticos', {
        method: 'POST',
        body: JSON.stringify({
          // Formato nuevo
          usuario:           user.username,
          nombre:            user.nombre,
          partidoId,
          golesLocal:        nuevoProno.golesLocal,
          golesVisitante:    nuevoProno.golesVisitante,
          // Retrocompatibilidad AWS Lambda antigua
          partido_id:        partidoId,
          marcadorCombinado: nuevoProno.marcadorCombinado,
          marcador_combinado:nuevoProno.marcadorCombinado,
          userCedula:        user.username,
          user_id:           user.username,
          nombreJugador:     user.nombre
        })
      });
    } catch (err) {
      console.warn('No se pudo enviar pronóstico a AWS, quedó guardado localmente:', err.message);
    }

    setApuestaSuccess(prev => ({ ...prev, [partidoId]: true }));
    await loadData();
    setTimeout(() => setApuestaSuccess(prev => ({ ...prev, [partidoId]: false })), 4000);
    setApuestaLoading(prev => ({ ...prev, [partidoId]: false }));
  };

  // ── Render flag ─────────────────────────────────────────────────────────

  const renderFlag = (teamName) => {
    const url = getCountryFlagUrl(teamName);
    if (!url) return null;
    return <img src={url} alt={teamName} className="h-6 w-6 rounded-full object-cover aspect-square shadow-sm inline-block mr-1" />;
  };

  // ── States de carga/error ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-gray-400 flex flex-col items-center gap-4">
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
          <button onClick={loadData} className="px-4 py-2 bg-brand-blue-800 hover:bg-brand-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2">
            <RefreshCw size={14} /><span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Render principal ─────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8 space-y-12 animate-fade-in pb-16">

      {/* ── SECCIÓN 1: MIS PRONÓSTICOS ───────────────────────────────── */}
      {activeSection === 'mis-pronosticos' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Mis Pronósticos ({misPronosticos.length})</h2>
              <p className="text-sm text-gray-400">Tus marcadores registrados para el gran premio.</p>
            </div>
            <button onClick={loadData} className="p-2 bg-brand-blue-900 border border-brand-blue-800 hover:bg-brand-blue-800 text-gray-300 hover:text-white rounded-lg transition-all active:scale-95" title="Actualizar">
              <RefreshCw size={14} />
            </button>
          </div>

          {misPronosticos.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-dashed border-gold-500/20 text-center text-gray-400">
              Aún no has registrado ningún pronóstico. ¡Ve a la sección <span className="text-gold-400 font-bold">Partidos y Apuestas</span> para apostar!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {misPronosticos.map((pronostico) => {
                const partido = partidos.find(p => p.id === pronostico.partidoId) || {};
                const tieneMarcadorReal = partido.golesRealLocal !== null && partido.golesRealLocal !== undefined
                  && partido.golesRealVisitante !== null && partido.golesRealVisitante !== undefined;
                const esGanador = tieneMarcadorReal
                  && pronostico.golesLocal     === partido.golesRealLocal
                  && pronostico.golesVisitante === partido.golesRealVisitante;

                return (
                  <div
                    key={pronostico.id}
                    className={`glass-card rounded-2xl p-4 border-l-4 flex justify-between items-center bg-brand-blue-900/20 hover:brightness-105 transition-all ${
                      esGanador ? 'border-l-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-l-gold-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${esGanador ? 'text-emerald-400' : 'text-gold-500'}`}>
                          {tieneMarcadorReal ? (esGanador ? 'Marcador Acertado ✓' : 'Finalizado') : 'Pronóstico Guardado'}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-white flex items-center gap-1.5">
                        {renderFlag(partido.equipo1)}<span>{partido.equipo1 || pronostico.partidoId}</span>
                        <span className="text-xs text-gold-500 font-bold">vs</span>
                        {renderFlag(partido.equipo2)}<span>{partido.equipo2}</span>
                      </p>
                      {tieneMarcadorReal && (
                        <p className="text-xs text-gray-400 mt-1">
                          Resultado real: <span className="font-bold text-white">{partido.golesRealLocal} - {partido.golesRealVisitante}</span>
                        </p>
                      )}
                    </div>
                    <div className={`font-extrabold text-lg px-4 py-2 rounded-xl border ${
                      esGanador
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
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

      {/* ── SECCIÓN 2: PARTIDOS ACTIVOS Y APOSTAR ────────────────────── */}
      {(activeSection === 'partidos' || !activeSection) && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 tracking-wide">Partidos Activos y Apuestas de Amigos</h2>
          <p className="text-sm text-gray-400 mb-6">
            Escribe tu marcador (máximo 20 goles). Las apuestas se habilitan 2 horas antes y se cierran 10 minutos antes del partido. Solo puedes registrar <span className="text-gold-400 font-semibold">un pronóstico por partido</span>.
          </p>

          {partidos.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
              No hay partidos programados en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {partidos.map((partido) => {
                const inputs       = pronosticoInputs[partido.id] || { golesLocal: '', golesVisitante: '' };
                const yaApostado   = misPronosticos.some(p => p.partidoId === partido.id);
                const isLoading    = apuestaLoading[partido.id];
                const matchError   = apuestaError[partido.id];
                const matchSuccess = apuestaSuccess[partido.id];
                const windowStatus = getBettingWindowStatus(partido.fecha, partido.hora);

                // Pronósticos de OTROS usuarios para este partido
                const otrosPronosticos = todosPronosticos.filter(
                  p => p.partidoId === partido.id && p.usuario !== user.username
                );

                return (
                  <div
                    key={partido.id}
                    className={`glass-card rounded-3xl p-6 border transition-all ${
                      yaApostado ? 'border-gold-500/30 bg-gold-500/5' : 'border-gold-500/10'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                      {/* Detalles del partido */}
                      <div className="flex-1 text-center lg:text-left space-y-2.5">
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-semibold text-gray-400">
                          <span className="flex items-center gap-1"><Calendar size={12} className="text-brand-blue-600" />{partido.fecha}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock size={12} className="text-brand-blue-600" />{partido.hora}</span>
                          {yaApostado && (
                            <span className="bg-gold-500/10 text-gold-500 border border-gold-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                              Tu Apuesta Registrada
                            </span>
                          )}
                          {partido.golesRealLocal !== null && partido.golesRealLocal !== undefined && (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                              Terminado: {partido.golesRealLocal} - {partido.golesRealVisitante}
                            </span>
                          )}
                        </div>

                        {/* Ventana de apuestas */}
                        {(partido.golesRealLocal === null || partido.golesRealLocal === undefined) && (
                          <div className="flex justify-center lg:justify-start">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              windowStatus.open
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            }`}>
                              {windowStatus.open ? <Unlock size={12} /> : <Lock size={12} />}
                              {windowStatus.message}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-center lg:justify-start gap-3 text-lg font-bold text-white pt-1">
                          {renderFlag(partido.equipo1)}<span>{partido.equipo1}</span>
                          <span className="text-xs text-gray-500 font-normal">VS</span>
                          {renderFlag(partido.equipo2)}<span>{partido.equipo2}</span>
                        </div>
                      </div>

                      {/* Selector de marcadores */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase text-gray-500 mb-1 font-bold">Local</span>
                          <input
                            type="text"
                            value={inputs.golesLocal}
                            onChange={(e) => handleInputChange(partido.id, 'golesLocal', e.target.value)}
                            placeholder="0"
                            disabled={yaApostado || partido.golesRealLocal !== null || !windowStatus.open}
                            className="w-16 bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-gold-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>

                        <span className="text-xl font-bold text-gold-500 mt-4">-</span>

                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase text-gray-500 mb-1 font-bold">Visita</span>
                          <input
                            type="text"
                            value={inputs.golesVisitante}
                            onChange={(e) => handleInputChange(partido.id, 'golesVisitante', e.target.value)}
                            placeholder="0"
                            disabled={yaApostado || partido.golesRealLocal !== null || !windowStatus.open}
                            className="w-16 bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-3 text-center focus:outline-none focus:ring-1 focus:ring-gold-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Botón guardar / bloqueado */}
                        {yaApostado ? (
                          <div className="ml-4 px-5 py-3 rounded-xl font-extrabold text-sm bg-brand-blue-800/80 text-gold-500 border border-gold-500/20 flex items-center gap-2 cursor-default select-none">
                            <Lock size={14} />
                            <span>Apuesta Enviada</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEnviarPronostico(partido.id, partido)}
                            disabled={isLoading || partido.golesRealLocal !== null || !windowStatus.open}
                            className="ml-4 px-5 py-3 rounded-xl font-extrabold text-sm bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-gold-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span>{isLoading ? 'Guardando...' : 'Guardar Pronóstico'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mensajes de feedback */}
                    {matchSuccess && (
                      <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle size={14} /><span>¡Tu pronóstico ha sido guardado correctamente!</span>
                      </div>
                    )}
                    {matchError && (
                      <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={14} /><span>{matchError}</span>
                      </div>
                    )}

                    {/* Apuestas de amigos */}
                    <div className="mt-6 pt-4 border-t border-brand-blue-800/80">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-blue-600 mb-2">
                        Apuestas de tus amigos ({otrosPronosticos.length}):
                      </p>
                      {otrosPronosticos.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Ningún amigo ha apostado aún. ¡Sé el primero!</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {otrosPronosticos.map((p, idx) => (
                            <div key={idx} className="bg-brand-blue-950/60 border border-brand-blue-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 flex items-center gap-2">
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
