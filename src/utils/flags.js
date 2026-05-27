// Mapeo de nombres de países en español a sus códigos ISO correspondientes
const COUNTRY_CODES = {
  "argentina": "AR",
  "brasil": "BR",
  "colombia": "CO",
  "alemania": "DE",
  "francia": "FR",
  "españa": "ES",
  "espana": "ES",
  "mexico": "MX",
  "méxico": "MX",
  "canadá": "CA",
  "canada": "CA",
  "estados unidos": "US",
  "eeuu": "US",
  "usa": "US",
  "italia": "IT",
  "inglaterra": "GB",
  "portugals": "PT",
  "portugal": "PT",
  "uruguay": "UY",
  "ecuador": "EC",
  "países bajos": "NL",
  "paises bajos": "NL",
  "holanda": "NL",
  "croacia": "HR",
  "marruecos": "MA",
  "bélgica": "BE",
  "belgica": "BE",
  "japón": "JP",
  "japon": "JP",
  "senegal": "SN",
  "suiza": "CH",
  "dinamarca": "DK"
};

/**
 * Retorna la URL de la bandera del país. Si no se reconoce, retorna un placeholder de fútbol.
 * @param {string} countryName Nombre del país
 * @returns {string} URL de la bandera
 */
export function getCountryFlagUrl(countryName) {
  if (!countryName) return "⚽";
  
  const normalized = countryName.trim().toLowerCase();
  const code = COUNTRY_CODES[normalized];
  
  if (code) {
    return `https://flagsapi.com/${code}/flat/64.png`;
  }
  
  return null;
}
