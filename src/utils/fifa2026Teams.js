// 48 Selecciones clasificadas al Mundial 2026 con sus códigos ISO para banderas

export const FIFA_2026_TEAMS = [
  // CONMEBOL (6)
  { name: "Argentina",     code: "AR" },
  { name: "Brasil",        code: "BR" },
  { name: "Colombia",      code: "CO" },
  { name: "Ecuador",       code: "EC" },
  { name: "Uruguay",       code: "UY" },
  { name: "Venezuela",     code: "VE" },

  // CONCACAF (6 + 3 sedes automáticas)
  { name: "México",        code: "MX" },
  { name: "Estados Unidos",code: "US" },
  { name: "Canadá",        code: "CA" },
  { name: "Panamá",        code: "PA" },
  { name: "Costa Rica",    code: "CR" },
  { name: "Honduras",      code: "HN" },

  // UEFA (16)
  { name: "España",        code: "ES" },
  { name: "Francia",       code: "FR" },
  { name: "Alemania",      code: "DE" },
  { name: "Inglaterra",    code: "GB-ENG" },
  { name: "Portugal",      code: "PT" },
  { name: "Países Bajos",  code: "NL" },
  { name: "Italia",        code: "IT" },
  { name: "Bélgica",       code: "BE" },
  { name: "Croacia",       code: "HR" },
  { name: "Dinamarca",     code: "DK" },
  { name: "Austria",       code: "AT" },
  { name: "Suiza",         code: "CH" },
  { name: "Escocia",       code: "GB-SCT" },
  { name: "Serbia",        code: "RS" },
  { name: "Turquía",       code: "TR" },
  { name: "Ucrania",       code: "UA" },
  { name: "Hungría",       code: "HU" },
  { name: "Polonia",       code: "PL" },

  // CAF (África - 9)
  { name: "Marruecos",     code: "MA" },
  { name: "Senegal",       code: "SN" },
  { name: "Nigeria",       code: "NG" },
  { name: "Egipto",        code: "EG" },
  { name: "Camerún",       code: "CM" },
  { name: "Costa de Marfil",code:"CI" },
  { name: "Ghana",         code: "GH" },
  { name: "Sudáfrica",     code: "ZA" },
  { name: "Mali",          code: "ML" },

  // AFC (Asia - 8)
  { name: "Japón",         code: "JP" },
  { name: "Corea del Sur", code: "KR" },
  { name: "Arabia Saudita",code: "SA" },
  { name: "Australia",     code: "AU" },
  { name: "Irán",          code: "IR" },
  { name: "Iraq",          code: "IQ" },
  { name: "Uzbekistán",    code: "UZ" },
  { name: "Jordania",      code: "JO" },

  // OFC (Oceanía - 1)
  { name: "Nueva Zelanda", code: "NZ" },
];

/**
 * Retorna la URL de la bandera de FlagsAPI dado el código ISO del país.
 * Soporte especial para GB-ENG (England) y GB-SCT (Scotland) que no existen en FlagsAPI.
 */
export function getFlagUrl(code) {
  if (!code) return null;
  // Códigos especiales de sub-naciones del Reino Unido: usar bandera UK
  if (code === "GB-ENG" || code === "GB-SCT" || code === "GB-WLS") {
    return `https://flagsapi.com/GB/flat/64.png`;
  }
  return `https://flagsapi.com/${code}/flat/64.png`;
}
