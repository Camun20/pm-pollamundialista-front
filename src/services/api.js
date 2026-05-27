// Servicio de conexión al servidor principal de la Polla Mundialista

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://6ztxr0ymsk.execute-api.us-east-1.amazonaws.com";

/**
 * Cliente HTTP principal. Realiza peticiones al servidor y maneja errores de forma unificada.
 */
export const apiRequest = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const fetchOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error de conexión: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Si es un error de red (sin conexión)
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("No se pudo conectar al servidor. Verifica tu conexión a internet.");
    }
    throw error;
  }
};
