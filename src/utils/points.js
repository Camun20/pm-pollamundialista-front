/**
 * Calcula la puntuación y el mensaje correspondiente a un pronóstico basado en el resultado real de un partido.
 * 
 * @param {Object} partido Partido real con golesRealLocal, golesRealVisitante y ganadorPenaltis (para eliminatorias)
 * @param {Object} pronostico Pronóstico del usuario con golesLocal, golesVisitante y ganadorPenaltis (para eliminatorias)
 * @returns {Object} { puntos: number, mensaje: string }
 */
export function calcularPuntuacionYMensaje(partido, pronostico) {
  if (!partido || !pronostico) {
    return { puntos: 0, mensaje: 'No hay datos' };
  }

  const realLocal = partido.golesRealLocal !== null && partido.golesRealLocal !== undefined ? parseInt(partido.golesRealLocal) : null;
  const realVisitante = partido.golesRealVisitante !== null && partido.golesRealVisitante !== undefined ? parseInt(partido.golesRealVisitante) : null;
  
  if (realLocal === null || realVisitante === null) {
    return { puntos: 0, mensaje: 'Pronóstico Guardado' };
  }

  const pronoLocal = isNaN(parseInt(pronostico.golesLocal)) ? 0 : parseInt(pronostico.golesLocal);
  const pronoVisitante = isNaN(parseInt(pronostico.golesVisitante)) ? 0 : parseInt(pronostico.golesVisitante);
  
  const isKnockout = partido.fase !== 'Fase de Grupos';
  const isRealDraw = realLocal === realVisitante;
  const isPronoDraw = pronoLocal === pronoVisitante;
  const acertoMarcadorExacto = pronoLocal === realLocal && pronoVisitante === realVisitante;

  // Si es un empate en fase eliminatoria directa (Knockout)
  if (isRealDraw && isKnockout) {
    const realClasifica = partido.ganadorPenaltis;
    const pronoClasifica = pronostico.ganadorPenaltis;
    const acertoClasificado = !!(realClasifica && pronoClasifica && realClasifica === pronoClasifica);

    if (acertoMarcadorExacto && acertoClasificado) {
      // Regla 3: Si acierta que el resultado es un empate (resultado exacto) y acierta al clasificado
      return { puntos: 5, mensaje: 'Acertaste al marcador exacto y al clasificado +5 puntos' };
    }
    if (acertoMarcadorExacto && !acertoClasificado) {
      // Regla 4: Si acierta que el resultado es un empate (resultado exacto) y no acierta al clasificado
      return { puntos: 3, mensaje: 'Acertaste al marcador exacto pero no al clasificado +3 puntos' };
    }
    if (isPronoDraw && !acertoMarcadorExacto && acertoClasificado) {
      // Regla 5: Si acierta que el resultado es un empate (no resultado exacto) y acierta al clasificado
      return { puntos: 3, mensaje: 'Acertaste al empate, no al marcador exacto pero si al clasificado +3 puntos' };
    }
    if (isPronoDraw && !acertoMarcadorExacto && !acertoClasificado) {
      // Regla 6: Si acierta que el resultado es un empate (no resultado exacto) y no acierta al clasificado
      return { puntos: 1, mensaje: 'Acertaste al empate, no al marcador exacto ni al clasificado +1 puntos' };
    }
    
    // Si predijo un ganador pero quedó empate, no acertó nada
    return { puntos: 0, mensaje: 'No acertaste a nada +0 puntos' };
  }

  // Si no es un empate o es fase de grupos
  if (acertoMarcadorExacto) {
    // Regla 1: Si acierta el resultado exacto y al ganador/empate
    return { puntos: 5, mensaje: 'Acertaste al marcador exacto +5 puntos' };
  }

  // Acertar ganador/empate sin resultado exacto
  const isRealLocalWin = realLocal > realVisitante;
  const isRealVisitanteWin = realLocal < realVisitante;
  const isPronoLocalWin = pronoLocal > pronoVisitante;
  const isPronoVisitanteWin = pronoLocal < pronoVisitante;

  if (isRealLocalWin && isPronoLocalWin) {
    // Regla 2: Si acierta solo al ganador, sin el resultado exacto (Local gana)
    return { puntos: 3, mensaje: 'Acertaste al ganador pero no al marcador +3 puntos' };
  }
  if (isRealVisitanteWin && isPronoVisitanteWin) {
    // Regla 2: Si acierta solo al ganador, sin el resultado exacto (Visitante gana)
    return { puntos: 3, mensaje: 'Acertaste al ganador pero no al marcador +3 puntos' };
  }
  if (isRealDraw && isPronoDraw) {
    // Regla 2: En dado caso que sea un empate en fase de grupos
    return { puntos: 3, mensaje: 'Acertaste al empate pero no al marcador +3 puntos' };
  }

  // Regla 7: Si no acierta a nada
  return { puntos: 0, mensaje: 'No acertaste a nada +0 puntos' };
}
