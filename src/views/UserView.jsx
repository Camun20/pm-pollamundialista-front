import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

export default function UserView() {
  const { user } = useAuth();
  
  // Datos
  const [partidos, setPartidos] = useState([]);
  const [misPronosticos, setMisPronosticos] = useState([]);
  
  // Estados de carga e interacción
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selección temporal de marcador por partidoId
  // { [partidoId]: { golesLocal: 0, golesVisitante: 0 } }
  const [pronosticoInputs, setPronosticoInputs] = useState({});
  const [apuestaLoading, setApuestaLoading] = useState({});
  const [apuestaError, setApuestaError] = useState({});
  const [apuestaSuccess, setApuestaSuccess] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar partidos y todos los pronósticos en paralelo
      const [todosPartidos, todosPronosticos] = await Promise.all([
        apiRequest('/partidos'),
        apiRequest('/pronosticos')
      ]);

      setPartidos(todosPartidos);

      // Filtrar pronósticos para el usuario actual
      const filtrados = todosPronosticos.filter(p => p.usuario === user.username);
      setMisPronosticos(filtrados);

      // Inicializar los dropdowns de apuestas para partidos donde el usuario ya apostó
      const inputsIniciales = {};
      todosPartidos.forEach(partido => {
        const pronosticoExistente = filtrados.find(p => p.partidoId === partido.id);
        if (pronosticoExistente) {
          inputsIniciales[partido.id] = {
            golesLocal: pronosticoExistente.golesLocal,
            golesVisitante: pronosticoExistente.golesVisitante
          };
        } else {
          inputsIniciales[partido.id] = {
            golesLocal: 0,
            golesVisitante: 0
          };
        }
      });
      setPronosticoInputs(inputsIniciales);

    } catch (err) {
      setError(err.message || 'Error al cargar los datos de la polla.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.username]);

  const handleInputChange = (partidoId, campo, valor) => {
    setPronosticoInputs(prev => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [campo]: parseInt(valor)
      }
    }));
    // Limpiar alertas de este partido al cambiar valores
    setApuestaError(prev => ({ ...prev, [partidoId]: null }));
    setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));
  };

  const handleEnviarPronostico = async (partidoId) => {
    const seleccion = pronosticoInputs[partidoId];
    if (!seleccion) return;

    setApuestaLoading(prev => ({ ...prev, [partidoId]: true }));
    setApuestaError(prev => ({ ...prev, [partidoId]: null }));
    setApuestaSuccess(prev => ({ ...prev, [partidoId]: false }));

    try {
      await apiRequest('/pronosticos', {
        method: 'POST',
        body: JSON.stringify({
          usuario: user.username,
          partidoId,
          golesLocal: seleccion.golesLocal,
          golesVisitante: seleccion.golesVisitante
        })
      });

      setApuestaSuccess(prev => ({ ...prev, [partidoId]: true }));
      
      // Volver a cargar la lista de mis pronósticos para reflejar cambios
      const todosPronosticos = await apiRequest('/pronosticos');
      setMisPronosticos(todosPronosticos.filter(p => p.usuario === user.username));
      
    } catch (err) {
      // Capturamos el error específico del backend si el marcador está bloqueado por otro amigo
      setApuestaError(prev => ({ 
        ...prev, 
        [partidoId]: err.message || "Error al registrar pronóstico" 
      }));
    } finally {
      setApuestaLoading(prev => ({ ...prev, [partidoId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-gray-400 animate-pulse">
        <span className="inline-block animate-spin text-3xl mr-3">⚽</span> 
        Cargando la Polla Mundialista... ¡Prepara tus pronósticos!
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4 text-center">
        <div className="glass-card rounded-2xl p-6 border border-rose-500/20 text-rose-300">
          <p className="font-semibold">⚠️ {error}</p>
          <button 
            onClick={loadData} 
            className="mt-4 px-4 py-2 bg-brand-blue-800 hover:bg-brand-blue-700 text-white rounded-lg text-sm font-bold transition-all"
          >
            Reintentar Conexión 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8 space-y-12 animate-fade-in pb-16">
      
      {/* SECCIÓN 1: MIS PRONÓSTICOS */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🏆 Mis Pronósticos ({misPronosticos.length})
            </h2>
            <p className="text-sm text-gray-400">Los marcadores que ya registraste y tienes asegurados.</p>
          </div>
          <button 
            onClick={loadData}
            className="px-3 py-1.5 bg-brand-blue-800 hover:bg-brand-blue-700 text-gray-300 text-xs font-bold rounded-lg transition-all"
          >
            🔄 Actualizar Todo
          </button>
        </div>

        {misPronosticos.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 border border-dashed border-gold-500/20 text-center text-gray-400">
            Aún no has registrado ningún pronóstico. ¡Utiliza la sección de abajo para apostar! 👇
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {misPronosticos.map((pronostico) => (
              <div 
                key={pronostico.id} 
                className="glass-card rounded-2xl p-4 border-l-4 border-l-gold-500 flex justify-between items-center bg-brand-blue-900/20 hover:brightness-105 transition-all"
              >
                <div>
                  <p className="text-xs text-brand-blue-600 font-bold uppercase tracking-wider mb-1">
                    Marcador Asegurado 🔒
                  </p>
                  <p className="text-base font-semibold text-white">
                    {pronostico.equipo1} vs {pronostico.equipo2}
                  </p>
                </div>
                <div className="bg-gold-500/10 text-gold-500 font-extrabold text-lg px-4 py-2 rounded-xl border border-gold-500/20">
                  {pronostico.golesLocal} - {pronostico.golesVisitante}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: PARTIDOS ACTIVOS Y APOSTAR */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          ⚽ Partidos Activos y Apostar
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Selecciona tu marcador (hasta 5 goles). Recuerda: **el primer amigo en registrar un marcador exacto lo bloquea** para los demás.
        </p>

        {partidos.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-gray-500">
            No hay partidos activos en este momento. Dile a tu Administrador que cree encuentros.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {partidos.map((partido) => {
              const inputs = pronosticoInputs[partido.id] || { golesLocal: 0, golesVisitante: 0 };
              const yaPronosticado = misPronosticos.some(p => p.partidoId === partido.id);
              const isLoading = apuestaLoading[partido.id];
              const matchError = apuestaError[partido.id];
              const matchSuccess = apuestaSuccess[partido.id];

              return (
                <div 
                  key={partido.id} 
                  className={`glass-card rounded-3xl p-6 border transition-all ${
                    yaPronosticado ? 'border-gold-500/30 bg-gold-500/5' : 'border-gold-500/10'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Detalles del partido */}
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2 text-xs font-semibold text-brand-blue-600">
                        <span>📅 {partido.fecha}</span>
                        <span>•</span>
                        <span>⏰ {partido.hora}</span>
                        {yaPronosticado && (
                          <span className="ml-2 bg-gold-500/10 text-gold-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                            Ya Votaste
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-3 text-lg font-bold text-white">
                        <span>{partido.equipo1}</span>
                        <span className="text-xs text-gray-500 font-normal">VS</span>
                        <span>{partido.equipo2}</span>
                      </div>
                    </div>

                    {/* Selector de marcadores */}
                    <div className="flex items-center gap-3">
                      {/* Goles Local */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-gray-500 mb-1 font-bold">Local</span>
                        <select
                          value={inputs.golesLocal}
                          onChange={(e) => handleInputChange(partido.id, 'golesLocal', e.target.value)}
                          className="bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gold-500 font-bold"
                        >
                          {[0, 1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <span className="text-xl font-bold text-gold-500 mt-4">-</span>

                      {/* Goles Visitante */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-gray-500 mb-1 font-bold">Visita</span>
                        <select
                          value={inputs.golesVisitante}
                          onChange={(e) => handleInputChange(partido.id, 'golesVisitante', e.target.value)}
                          className="bg-brand-blue-900 border border-gold-500/20 text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gold-500 font-bold"
                        >
                          {[0, 1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      {/* Botón para enviar */}
                      <button
                        onClick={() => handleEnviarPronostico(partido.id)}
                        disabled={isLoading}
                        className={`ml-4 px-5 py-3 rounded-xl font-extrabold text-sm transition-all flex items-center gap-2 ${
                          yaPronosticado 
                            ? "bg-brand-blue-800 text-gold-500 hover:bg-brand-blue-700 hover:text-white" 
                            : "bg-gradient-to-r from-gold-600 to-gold-500 text-black hover:brightness-110 shadow-lg shadow-gold-500/10"
                        } active:scale-95 disabled:opacity-50`}
                      >
                        {isLoading ? "Enviando... ⏳" : yaPronosticado ? "Modificar Pronóstico" : "Apostar 🚀"}
                      </button>
                    </div>
                  </div>

                  {/* Mensajes y Alertas específicas por partido */}
                  {matchSuccess && (
                    <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
                      🎉 ¡Tu pronóstico ha sido registrado exitosamente en el backend!
                    </div>
                  )}

                  {matchError && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 animate-bounce">
                      <span>⚠️</span> {matchError}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
