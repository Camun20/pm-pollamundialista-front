// 48 Selecciones clasificadas al Mundial 2026 con sus códigos ISO para banderas

export const FIFA_2026_TEAMS = [
  // CONMEBOL (6)
  { name: "Argentina", code: "AR" },
  { name: "Brasil", code: "BR" },
  { name: "Colombia", code: "CO" },
  { name: "Ecuador", code: "EC" },
  { name: "Uruguay", code: "UY" },
  { name: "Paraguay", code: "PY" },

  // CONCACAF (6 + 3 sedes automáticas)
  { name: "México", code: "MX" },
  { name: "Estados Unidos", code: "US" },
  { name: "Canadá", code: "CA" },
  { name: "Panamá", code: "PA" },
  { name: "Haití", code: "HT" },
  { name: "Curazao", code: "CW" },

  // UEFA (16)
  { name: "España", code: "ES" },
  { name: "Francia", code: "FR" },
  { name: "Alemania", code: "DE" },
  { name: "Inglaterra", code: "GB-ENG" },
  { name: "Portugal", code: "PT" },
  { name: "Países Bajos", code: "NL" },
  { name: "Bélgica", code: "BE" },
  { name: "Croacia", code: "HR" },
  { name: "Austria", code: "AT" },
  { name: "Suiza", code: "CH" },
  { name: "Escocia", code: "GB-SCT" },
  { name: "Turquía", code: "TR" },
  { name: "República Checa", code: "CZ" },
  { name: "Bosnia y Herzegovina", code: "BA" },
  { name: "Suecia", code: "SE" },
  { name: "Noruega", code: "NO" },

  // CAF (África - 9)
  { name: "Marruecos", code: "MA" },
  { name: "Senegal", code: "SN" },
  { name: "Egipto", code: "EG" },
  { name: "Costa de Marfil", code: "CI" },
  { name: "Ghana", code: "GH" },
  { name: "Sudáfrica", code: "ZA" },
  { name: "Túnez", code: "TN" },
  { name: "Cabo Verde", code: "CV" },
  { name: "Argelia", code: "DZ" },
  { name: "República del Congo", code: "CD" },

  // AFC (Asia - 8)
  { name: "Japón", code: "JP" },
  { name: "Corea del Sur", code: "KR" },
  { name: "Arabia Saudita", code: "SA" },
  { name: "Australia", code: "AU" },
  { name: "Irán", code: "IR" },
  { name: "Iraq", code: "IQ" },
  { name: "Uzbekistán", code: "UZ" },
  { name: "Jordania", code: "JO" },
  { name: "Qatar", code: "QA" },

  // OFC (Oceanía - 1)
  { name: "Nueva Zelanda", code: "NZ" },
];

/**
 * Retorna la URL de la bandera de FlagCDN dado el código ISO del país.
 * Soporta códigos regionales como GB-ENG y GB-SCT de manera nativa.
 */
export function getFlagUrl(code) {
  if (!code) return null;
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}
