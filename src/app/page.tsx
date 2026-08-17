'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion_minutos: number
}

const generarHorarios = () => {
  const horarios = []
  for (let h = 9; h <= 18; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`)
    if (h !== 18) horarios.push(`${h.toString().padStart(2, '0')}:30`)
  }
  return horarios
}

export default function Home() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargando, setCargando] = useState(true)

  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [enlaceWhatsapp, setEnlaceWhatsapp] = useState('')

  const horariosDisponibles = generarHorarios()

  // ⚠️ CAMBIA ESTE NÚMERO POR EL WHATSAPP REAL DE LA BARBERÍA (Incluye el indicativo, ej: 57)
  const WHATSAPP_NEGOCIO = "573005980054" 

  useEffect(() => {
    async function cargarServicios() {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre, precio, duracion_minutos')
        .eq('activo', true)

      if (!error) setServicios(data || [])
      setCargando(false)
    }
    cargarServicios()
  }, [])

  const handleAgendarCita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servicioSeleccionado || !nombreCliente || !telefonoCliente || !fechaSeleccionada || !horaSeleccionada) return

    setGuardando(true)

    try {
      const negocioId = '11111111-1111-1111-1111-111111111111'

      const { data: cliente, error: errorCliente } = await supabase
        .from('clientes')
        .insert([{ negocio_id: negocioId, nombre: nombreCliente, telefono: telefonoCliente }])
        .select()
        .single()

      if (errorCliente) throw errorCliente

      const [year, month, day] = fechaSeleccionada.split('-')
      const [hour, minute] = horaSeleccionada.split(':')
      const fechaInicio = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
      const fechaFin = new Date(fechaInicio.getTime() + servicioSeleccionado.duracion_minutos * 60000)

      const { error: errorCita } = await supabase.from('citas').insert([{
        negocio_id: negocioId,
        cliente_id: cliente.id,
        servicio_id: servicioSeleccionado.id,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        estado: 'confirmada',
        precio_congelado: servicioSeleccionado.precio,
      }])

      if (errorCita) throw errorCita

      // Generar mensaje de WhatsApp dinámico
      const textoMensaje = `¡Hola! Acabo de agendar una cita en CitaPro. ✂️%0A%0A*Mis detalles:*%0A👤 Nombre: ${nombreCliente}%0A💈 Servicio: ${servicioSeleccionado.nombre}%0A📅 Fecha: ${fechaSeleccionada}%0A⏰ Hora: ${horaSeleccionada}%0A💵 Valor: $${Number(servicioSeleccionado.precio).toLocaleString('es-CO')}%0A%0A¡Nos vemos pronto!`
      
      setEnlaceWhatsapp(`https://wa.me/${WHATSAPP_NEGOCIO}?text=${textoMensaje}`)
      setMensajeExito(`¡Listo ${nombreCliente.split(' ')[0]}! Tu cita ha sido registrada.`)
      cerrarModal()
    } catch (err) {
      console.error('Error al agendar cita:', err)
      alert('Ocurrió un error al guardar la cita.')
    } finally {
      setGuardando(false)
    }
  }

  const cerrarModal = () => {
    setServicioSeleccionado(null)
    setNombreCliente('')
    setTelefonoCliente('')
    setFechaSeleccionada('')
    setHoraSeleccionada('')
  }

  const fechaMinima = new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">CitaPro</h1>
          <p className="text-slate-500 mt-2 text-lg">Reserva tu espacio en <span className="font-semibold text-slate-700">Barbería Vintage VIP</span></p>
        </header>

        {/* ALERTA DE ÉXITO CON BOTÓN DE WHATSAPP */}
        {mensajeExito && (
          <div className="mb-8 p-6 bg-white border-2 border-emerald-500 rounded-2xl shadow-xl animate-in zoom-in-95 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-emerald-600 mb-1">🎉 {mensajeExito}</h3>
              <p className="text-slate-600 text-sm">Por favor, envíanos un mensaje para confirmar tu asistencia.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <a 
                href={enlaceWhatsapp} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setMensajeExito('')}
                className="flex-1 md:flex-none bg-[#25D366] hover:bg-[#1ebe57] text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Confirmar
              </a>
              <button 
                onClick={() => setMensajeExito('')} 
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {cargando ? (
          <div className="text-center py-20 text-slate-500">Cargando catálogo de servicios...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {servicios.map((servicio) => (
              <div key={servicio.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{servicio.nombre}</h2>
                    <p className="text-sm font-medium text-slate-400 mt-1 flex items-center">
                      ⏱️ {servicio.duracion_minutos} minutos
                    </p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-sm">
                    ${Number(servicio.precio).toLocaleString('es-CO')}
                  </span>
                </div>
                <button 
                  onClick={() => setServicioSeleccionado(servicio)}
                  className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition active:scale-[0.98]"
                >
                  Reservar Ahora
                </button>
              </div>
            ))}
          </div>
        )}

        {servicioSeleccionado && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4 transition-all">
            <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-2xl font-bold text-slate-900">Configurar Cita</h2>
                <p className="text-slate-500 mt-1">{servicioSeleccionado.nombre} • ${Number(servicioSeleccionado.precio).toLocaleString('es-CO')}</p>
              </div>
              <div className="p-6 overflow-y-auto">
                <form id="form-cita" onSubmit={handleAgendarCita} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">1</span> 
                      ¿Cuándo quieres venir?
                    </h3>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Fecha</label>
                      <input 
                        type="date" 
                        required min={fechaMinima} value={fechaSeleccionada} 
                        onChange={(e) => { setFechaSeleccionada(e.target.value); setHoraSeleccionada(''); }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      />
                    </div>
                    {fechaSeleccionada && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm text-slate-600 mb-2">Horas Disponibles</label>
                        <div className="grid grid-cols-4 gap-2">
                          {horariosDisponibles.map((hora) => (
                            <button
                              key={hora} type="button" onClick={() => setHoraSeleccionada(hora)}
                              className={`py-2 text-sm font-medium rounded-lg border transition-all ${horaSeleccionada === hora ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                            >
                              {hora}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {horaSeleccionada && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
                      <h3 className="font-semibold text-slate-900 flex items-center">
                        <span className="bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">2</span> 
                        Tus Datos
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <input type="text" required value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Nombre completo" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                        <div>
                          <input type="tel" required value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} placeholder="Teléfono" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button type="button" onClick={cerrarModal} className="px-5 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition">Cancelar</button>
                <button type="submit" form="form-cita" disabled={!horaSeleccionada || guardando} className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-200">
                  {guardando ? 'Procesando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}