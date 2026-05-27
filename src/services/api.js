// Configuración de la API para la Polla Mundialista

// URL base de AWS API Gateway (se puede sobreescribir mediante la UI de configuración o localStorage)
const DEFAULT_API_URL = "https://tu-api-gateway.execute-api.us-east-1.amazonaws.com/prod";

export const getApiBaseUrl = () => {
  return localStorage.getItem("pm_api_url") || DEFAULT_API_URL;
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem("pm_api_url", url);
};

// Determina si se está usando el modo simulador (Mock)
export const isMockModeEnabled = () => {
  const stored = localStorage.getItem("pm_mock_mode");
  return stored === null ? true : stored === "true"; // Por defecto iniciamos en mock para que sea interactivo de inmediato
};

export const setMockMode = (enabled) => {
  localStorage.setItem("pm_mock_mode", enabled ? "true" : "false");
};

// --- BASE DE DATOS SIMULADA PARA MODO MOCK ---
const initializeMockData = () => {
  if (!localStorage.getItem("mock_partidos")) {
    const defaultPartidos = [
      { id: "p1", equipo1: "Argentina", equipo2: "Francia", fecha: "2026-06-15", hora: "15:00" },
      { id: "p2", equipo1: "Brasil", equipo2: "Alemania", fecha: "2026-06-16", hora: "13:00" },
      { id: "p3", equipo1: "Colombia", equipo2: "España", fecha: "2026-06-17", hora: "19:00" }
    ];
    localStorage.setItem("mock_partidos", JSON.stringify(defaultPartidos));
  }

  if (!localStorage.getItem("mock_pronosticos")) {
    const defaultPronosticos = [
      { id: "pr1", usuario: "carlos_gomez", partidoId: "p1", equipo1: "Argentina", equipo2: "Francia", golesLocal: 2, golesVisitante: 1 },
      { id: "pr2", usuario: "maria_sanchez", partidoId: "p1", equipo1: "Argentina", equipo2: "Francia", golesLocal: 3, golesVisitante: 2 },
      { id: "pr3", usuario: "carlos_gomez", partidoId: "p2", equipo1: "Brasil", equipo2: "Alemania", golesLocal: 1, golesVisitante: 1 }
    ];
    localStorage.setItem("mock_pronosticos", JSON.stringify(defaultPronosticos));
  }
};

initializeMockData();

// --- CLIENTE API ---
export const apiRequest = async (path, options = {}) => {
  const mockMode = isMockModeEnabled();
  const url = `${getApiBaseUrl()}${path}`;
  
  if (!mockMode) {
    // LLAMADO REAL A AWS API GATEWAY
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    
    const fetchOptions = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error en API Request real a ${path}:`, error);
      throw error;
    }
  }

  // --- SIMULADOR DE MOCK BACKEND ---
  await new Promise(resolve => setTimeout(resolve, 800)); // Simula latencia de red
  
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;

  // RUTAS DE AUTENTICACIÓN
  if (path === "/login" && method === "POST") {
    const { username, password } = body;
    if (username === "admin" && password === "admin") {
      return { username: "admin", nombre: "Administrador", rol: "admin" };
    } else if (username && password) {
      return { username, nombre: username.charAt(0).toUpperCase() + username.slice(1), rol: "user" };
    }
    throw new Error("Usuario o contraseña incorrectos");
  }

  // RUTAS DE PARTIDOS
  if (path === "/partidos") {
    const partidos = JSON.parse(localStorage.getItem("mock_partidos") || "[]");
    
    if (method === "GET") {
      return partidos;
    }
    
    if (method === "POST") {
      const nuevoPartido = {
        id: "p_" + Date.now(),
        ...body
      };
      partidos.push(nuevoPartido);
      localStorage.setItem("mock_partidos", JSON.stringify(partidos));
      return nuevoPartido;
    }
  }

  // RUTAS DE PRONÓSTICOS
  if (path === "/pronosticos") {
    const pronosticos = JSON.parse(localStorage.getItem("mock_pronosticos") || "[]");
    
    if (method === "GET") {
      return pronosticos;
    }

    if (method === "POST") {
      const { usuario, partidoId, golesLocal, golesVisitante } = body;
      
      // Regla de negocio: Verificar si el marcador exacto ya fue bloqueado por otro amigo en ese mismo partido
      const marcadorDuplicado = pronosticos.find(
        p => p.partidoId === partidoId && 
             p.golesLocal === parseInt(golesLocal) && 
             p.golesVisitante === parseInt(golesVisitante) &&
             p.usuario !== usuario // de otro usuario
      );

      if (marcadorDuplicado) {
        throw new Error("Este marcador ya fue bloqueado por otro usuario");
      }

      // Obtener equipos
      const partidos = JSON.parse(localStorage.getItem("mock_partidos") || "[]");
      const partido = partidos.find(p => p.id === partidoId) || {};

      // Eliminar pronóstico anterior del mismo usuario en este partido si existe
      const pronosticosFiltrados = pronosticos.filter(
        p => !(p.usuario === usuario && p.partidoId === partidoId)
      );

      const nuevoPronostico = {
        id: "pr_" + Date.now(),
        usuario,
        partidoId,
        equipo1: partido.equipo1 || "Equipo 1",
        equipo2: partido.equipo2 || "Equipo 2",
        golesLocal: parseInt(golesLocal),
        golesVisitante: parseInt(golesVisitante)
      };

      pronosticosFiltrados.push(nuevoPronostico);
      localStorage.setItem("mock_pronosticos", JSON.stringify(pronosticosFiltrados));
      return nuevoPronostico;
    }
  }

  throw new Error("Endpoint no encontrado en el simulador mock");
};
