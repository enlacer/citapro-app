import { supabase } from '@/lib/supabase';

export async function obtenerDisponibilidad(
  trabajadorId,
  fechaSeleccionada,
  duracionMinutos
) {
  // 1. Obtener la hora actual EXACTA en Bogotá, Colombia
  // Esto ignora la hora del PC del usuario y usa el estándar de Bogotá
  const horaBogotaStr = new Date().toLocaleString("en-US", {timeZone: "America/Bogota"});
  const ahoraBogota = new Date(horaBogotaStr);
  
  // Extraer componentes de la fecha actual en Bogotá
  const anioActual = ahoraBogota.getFullYear();
  const mesActual = ahoraBogota.getMonth();
  const diaActual = ahoraBogota.getDate();
  const horaActual = ahoraBogota.getHours();
  const minActual = ahoraBogota.getMinutes();

  // 2. Definir rango del día seleccionado
  const inicioDia = `${fechaSeleccionada}T00:00:00`;
  const finDia = `${fechaSeleccionada}T23:59:59`;

  // 3. Consultar citas ocupadas
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
  if (error) { console.error('Error:', error); return []; }

  // 4. Generar horas posibles
  const horasPosibles = [];
  const horaInicioJornada = 8;
  const horaFinJornada = 18;
  const intervaloMinutos = 30;

  for (let h = horaInicioJornada; h < horaFinJornada; h++) {
    for (let m = 0; m < 60; m += intervaloMinutos) {
      const horaStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      // Lógica de filtrado con HORA BOGOTÁ
      const [y, mm, d] = fechaSeleccionada.split('-').map(Number);
      
      // ¿Es hoy en Bogotá?
      const esHoy = (y === anioActual && mm === (mesActual + 1) && d === diaActual);
      
      // Si es hoy, bloqueamos si la hora generada es anterior a la hora de Bogotá actual
      if (esHoy) {
        if (h < horaActual || (h === horaActual && m <= minActual)) {
          continue; // Esta hora ya pasó en Bogotá
        }
      }

      horasPosibles.push(horaStr);
    }
  }

  // 5. Filtrar conflictos
  return horasPosibles.filter((hora) => {
    const [y, mm, d] = fechaSeleccionada.split('-').map(Number);
    const inicioSlot = new Date(y, mm - 1, d, parseInt(hora.split(':')[0]), parseInt(hora.split(':')[1])).getTime();
    const finSlot = inicioSlot + duracionMinutos * 60000;

    const hayConflicto = citasExistentes?.some((cita) => {
      const inicioCita = new Date(cita.fecha_inicio).getTime();
      const finCita = new Date(cita.fecha_fin).getTime();
      return inicioSlot < finCita && finSlot > inicioCita;
    });

    return !hayConflicto;
  });
}