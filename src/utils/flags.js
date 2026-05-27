import { FIFA_2026_TEAMS, getFlagUrl } from './fifa2026Teams';

/**
 * Retorna la URL de la bandera del país de la lista de los 48 países del Mundial 2026.
 * @param {string} countryName Nombre del país
 * @returns {string|null} URL de la bandera o null si no se encuentra
 */
export function getCountryFlagUrl(countryName) {
  if (!countryName || typeof countryName !== 'string') return null;
  
  const normalizeText = (text) => 
    typeof text === 'string' 
      ? text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
      : "";

  const normalizedInput = normalizeText(countryName);
  
  const team = FIFA_2026_TEAMS.find(t => normalizeText(t.name) === normalizedInput);
  
  if (team) {
    return getFlagUrl(team.code);
  }
  
  return null;
}
