// Configuración de la API para la Polla Mundialista

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || "https://6ztxr0ymsk.execute-api.us-east-1.amazonaws.com";

export const getApiBaseUrl = () => {
  return localStorage.getItem("pm_api_url") || DEFAULT_API_URL;
};

export const setApiBaseUrl = (url) => {
  localStorage.setItem("pm_api_url", url);
};

export const isMockModeEnabled = () => {
  const stored = localStorage.getItem("pm_mock_mode");
  return stored === null ? true : stored === "true";
};

export const setMockMode = (enabled) => {
  localStorage.setItem("pm_mock_mode", enabled ? "true" : "false");
};

// --- BASE DE DATOS SIMULADA PARA MODO MOCK ---
const initializeMockData = () => {
  if (!localStorage.getItem("mock_partidos")) {
    const defaultPartidos = [
      { id: "p1", equipo1: "Argentina", equipo2: "Francia", fecha: "2026-06-15", hora: "15:00", golesRealLocal: null, golesRealVisitante: null },
      { id: "p2", equipo1: "Brasil", equipo2: "Alemania", fecha: "2026-06-16", hora: "13:00", golesRealLocal: null, golesRealVisitante: null },
      { id: "p3", equipo1: "Colombia", equipo2: "España", fecha: "2026-06-17", hora: "19:00", golesRealLocal: null, golesRealVisitante: null }
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

  if (!localStorage.getItem("mock_usuarios")) {
    const defaultUsuarios = [
      { username: "admin", nombre: "Administrador", rol: "admin", contrasena: "admin" },
      { username: "carlos_gomez", nombre: "Carlos Gómez", rol: "user", contrasena: "123" },
      { username: "maria_sanchez", nombre: "María Sánchez", rol: "user", contrasena: "123" }
    ];
    localStorage.setItem("mock_usuarios", JSON.stringify(defaultUsuarios));
  }
};

initializeMockData();

// --- CLIENTE API ---
export const apiRequest = async (path, options = {}) => {
  const mockMode = isMockModeEnabled();
  const url = `${getApiBaseUrl()}${path}`;

  if (!mockMode) {
    // LLAMADO REAL A API
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
  await new Promise(resolve => setTimeout(resolve, 600)); // Latencia simulada
  
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;

  // RUTAS DE AUTENTICACIÓN
  if (path === "/login" && method === "POST") {
    const { username, password } = body;
    const usuarios = JSON.parse(localStorage.getItem("mock_usuarios") || "[]");
    const usuarioEncontrado = usuarios.find(u => u.username === username.toLowerCase() && u.contrasena === password);
    
    if (usuarioEncontrado) {
      return { username: usuarioEncontrado.username, nombre: usuarioEncontrado.nombre, rol: usuarioEncontrado.rol };
    }
    throw new Error("Usuario o contraseña incorrectos");
  }

  // RUTAS DE USUARIOS (Administrador)
  if (path === "/usuarios") {
    const usuarios = JSON.parse(localStorage.getItem("mock_usuarios") || "[]");
    
    if (method === "GET") {
      // Retornamos sin contraseñas por seguridad
      return usuarios.map(({ contrasena, ...u }) => u);
    }
    
    if (method === "POST") {
      const { username, nombre, rol, contrasena } = body;
      const userLower = username.toLowerCase();
      if (usuarios.some(u => u.username === userLower)) {
        throw new Error("El usuario ya existe");
      }
      const nuevoUsuario = { username: userLower, nombre, rol, contrasena: contrasena || "123" };
      usuarios.push(nuevoUsuario);
      localStorage.setItem("mock_usuarios", JSON.stringify(usuarios));
      return { username: nuevoUsuario.username, nombre: nuevoUsuario.nombre, rol: nuevoUsuario.rol };
    }
  }

  if (path.startsWith("/usuarios/") && method === "DELETE") {
    const userToDelete = path.split("/").pop();
    let usuarios = JSON.parse(localStorage.getItem("mock_usuarios") || "[]");
    if (userToDelete === "admin") {
      throw new Error("No se puede eliminar el administrador por defecto");
    }
    usuarios = usuarios.filter(u => u.username !== userToDelete);
    localStorage.setItem("mock_usuarios", JSON.stringify(usuarios));
    return { success: true };
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
        ...body,
        golesRealLocal: null,
        golesRealVisitante: null
      };
      partidos.push(nuevoPartido);
      localStorage.setItem("mock_partidos", JSON.stringify(partidos));
      return nuevoPartido;
    }
  }

  if (path.startsWith("/partidos/resultado") && method === "POST") {
    const { partidoId, golesRealLocal, golesRealVisitante } = body;
    const partidos = JSON.parse(localStorage.getItem("mock_partidos") || "[]");
    const index = partidos.findIndex(p => p.id === partidoId);
    
    if (index !== -1) {
      partidos[index].golesRealLocal = golesRealLocal === "" || golesRealLocal === null ? null : parseInt(golesRealLocal);
      partidos[index].golesRealVisitante = golesRealVisitante === "" || golesRealVisitante === null ? null : parseInt(golesRealVisitante);
      localStorage.setItem("mock_partidos", JSON.stringify(partidos));
      return partidos[index];
    }
    throw new Error("Partido no encontrado");
  }

  // RUTAS DE PRONÓSTICOS
  if (path === "/pronosticos") {
    const pronosticos = JSON.parse(localStorage.getItem("mock_pronosticos") || "[]");

    if (method === "GET") {
      return pronosticos;
    }

    if (method === "POST") {
      const { usuario, partidoId, golesLocal, golesVisitante } = body;

      const partidos = JSON.parse(localStorage.getItem("mock_partidos") || "[]");
      const partido = partidos.find(p => p.id === partidoId) || {};

      // Retiramos validación de marcador duplicado para permitir repeticiones

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

  throw new Error("Endpoint no encontrado");
};
