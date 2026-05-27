/**
 * Verifica si la ventana de apuestas está activa para un partido.
 * Regla de negocio:
 *   - Se habilita 2 horas antes del inicio del partido
 *   - Se cierra 10 minutos antes del inicio del partido
 * Todo calculado en hora Colombia (UTC-5).
 *
 * @param {string} fechaStr - Fecha del partido en formato YYYY-MM-DD
 * @param {string} horaStr  - Hora del partido en formato HH:mm (hora Colombia)
 * @returns {{ open: boolean, message: string, minutesUntilOpen?: number, minutesUntilClose?: number }}
 */
export function getBettingWindowStatus(fechaStr, horaStr) {
  if (!fechaStr || !horaStr) {
    return { open: false, message: "Información de horario incompleta" };
  }

  // Construimos la fecha de inicio del partido en hora Colombia (UTC-5)
  // Usamos una cadena ISO con offset explícito para evitar problemas de zona horaria del navegador
  const [year, month, day] = fechaStr.split("-").map(Number);
  const [hh, mm] = horaStr.split(":").map(Number);

  // Fecha de inicio del partido en UTC (Colombia es UTC-5, entonces sumamos 5 horas)
  const kickoffUTC = Date.UTC(year, month - 1, day, hh + 5, mm, 0);

  // Ventanas en milisegundos
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;    // Abre
  const TEN_MINUTES_MS = 10 * 60 * 1000;        // Cierra

  const openTimeUTC = kickoffUTC - TWO_HOURS_MS;
  const closeTimeUTC = kickoffUTC - TEN_MINUTES_MS;

  const nowUTC = Date.now();

  if (nowUTC < openTimeUTC) {
    const minutesLeft = Math.ceil((openTimeUTC - nowUTC) / 60000);
    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsLeft = minutesLeft % 60;
    return {
      open: false,
      state: "not_open_yet",
      message: `Las apuestas abren en ${hoursLeft > 0 ? `${hoursLeft}h ` : ""}${minsLeft}min`,
      minutesUntilOpen: minutesLeft,
    };
  }

  if (nowUTC >= openTimeUTC && nowUTC <= closeTimeUTC) {
    const minutesLeft = Math.ceil((closeTimeUTC - nowUTC) / 60000);
    return {
      open: true,
      state: "open",
      message: `Ventana de apuestas abierta — Cierra en ${minutesLeft}min`,
      minutesUntilClose: minutesLeft,
    };
  }

  // El tiempo ya cerró (10min antes del partido o después)
  return {
    open: false,
    state: "closed",
    message: "Las apuestas para este partido ya cerraron",
  };
}
