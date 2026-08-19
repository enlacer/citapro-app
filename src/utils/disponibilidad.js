import { supabase } from '@/lib/supabase';

export async function obtenerDisponibilidad(trabajadorId, fechaSeleccionada, duracionMinutos) {
  // 1. Obtener hora actual estandarizada en Bogotá (-05:00)
  const ahoraBogota = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );

  const [anioSel, mesSel, diaSel] = fechaSeleccionada.split('-').map(Number);
  const esHoy =
    anioSel === ahoraBogota.getFullYear() &&
    mesSel === ahoraBogota.getMonth() + 1 &&
    diaSel === ahoraBogota.getDate();

  // 2. Consulta de citas del día
  const inicioDia = `${fechaSeleccionada}T00:00:00.000Z`;
  const finDia = `${fechaSeleccionada}T23:59:59.999Z`;

  let query = supabase
    .from('citas')
    .select('fecha_inicio, fecha_fin, trabajador_id')
    .gte('fecha_inicio', inicioDia)
    .lte('fecha_inicio', finDia)
    .in('estado', ['pendiente', 'confirmada', 'completada']);

  if (trabajadorId) {
    query = query.eq('trabajador_id', trabajadorId);
  }

  const { data: citasExistentes, error } = await query;
  if (error) {
    console.error('Error al consultar citas:', error);
    return [];
  }

  // 3. Generar franjas horarias (08:00 a 18:00)
  const horasPosibles = [];
  const horaInicioJornada = 8;
  const horaFinJornada = 18;
  const intervaloMinutos = 30;

  for (let h = horaInicioJornada; h < horaFinJornada; h++) {
    for (let m = 0; m < 60; m += intervaloMinutos) {
      if (esHoy) {
        if (h < ahoraBogota.getHours() || (h === ahoraBogota.getHours() && m <= ahoraBogota.getMinutes())) {
          continue; // Omitir horas pasadas hoy en Bogotá
        }
      }
      horasPosibles.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  // 4. Filtrar conflictos comparando milisegundos reales
  return horasPosibles.filter((hora) => {
    const inicioSlot = new Date(`${fechaSeleccionada}T${hora}:00-05:00`).getTime();
    const finSlot = inicioSlot + duracionMinutos * 60000;

    const hayConflicto = citasExistentes?.some((cita) => {
      const inicioCita = new Date(cita.fecha_inicio).getTime();
      const finCita = new Date(cita.fecha_fin).getTime();
      return inicioSlot < finCita && finSlot > inicioCita;
    });

    return !hayConflicto;
  });
}