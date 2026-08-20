'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { obtenerDisponibilidad } from '@/utils/disponibilidad'

export default function ReservarCita() {
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [cargandoHoras, setCargandoHoras] = useState(false)

  const [servicios, setServicios] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [horasLibres, setHorasLibres] = useState<string[]>([])

  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any>(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('')
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('')
  
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', email: '' })

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  useEffect(() => {
    if (fechaSeleccionada && trabajadorSeleccionado && servicioSeleccionado) {
      cargarDisponibilidadReal()
    }
  }, [fechaSeleccionada, trabajadorSeleccionado, servicioSeleccionado])

  async function cargarDatosIniciales() {
    const { data: servs } = await supabase.from('servicios').select('*').eq('activo', true)
    const { data: trabs } = await supabase.from('trabajadores').select('*').eq('activo', true)
    if (servs) setServicios(servs)
    if (trabs) setTrabajadores(trabs)
  }

  async function cargarDisponibilidadReal() {
    setCargandoHoras(true)
    try {
      const duracion = servicioSeleccionado.duracion || 30
      const disponibles = await obtenerDisponibilidad(trabajadorSeleccionado.id, fechaSeleccionada, duracion)
      setHorasLibres(disponibles)
    } catch (error) {
      console.error('Error al calcular horarios:', error)
      setHorasLibres([])
    } finally {
      setCargandoHoras(false)
    }
  }

  async function confirmarReserva(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)

    try {
      const { data: clienteExistente, error: errBusqueda } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', cliente.telefono)
        .maybeSingle()

      if (errBusqueda) throw new Error('Error al buscar cliente: ' + errBusqueda.message)

      let clienteId = null

      if (clienteExistente) {
        clienteId = clienteExistente.id
        await supabase.from('clientes').update({ email: cliente.email, nombre: cliente.nombre }).eq('id', clienteId)
      } else {
        const { data: nuevoCliente, error: errCli } = await supabase.from('clientes').insert([cliente]).select().single()
        if (errCli) throw new Error('Error al registrar cliente: ' + errCli.message)
        clienteId = nuevoCliente.id
      }

      const fechaInicioObj = new Date(`${fechaSeleccionada}T${horaSeleccionada}:00`)
      const duracionMinutos = servicioSeleccionado.duracion || 30
      const fechaFinObj = new Date(fechaInicioObj.getTime() + duracionMinutos * 60000)

      const { error: errCita } = await supabase.from('citas').insert([{
        cliente_id: clienteId,
        servicio_id: servicioSeleccionado.id,
        trabajador_id: trabajadorSeleccionado.id,
        fecha_inicio: fechaInicioObj.toISOString(),
        fecha_fin: fechaFinObj.toISOString(),
        precio_congelado: servicioSeleccionado.precio,
        estado: 'pendiente'
      }])

      if (errCita) throw new Error('Error al guardar la cita: ' + errCita.message)

      await fetch('/api/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cliente.email, 
          nombre: cliente.nombre, 
          fecha: `${fechaSeleccionada} a las ${horaSeleccionada}`, 
          servicio: servicioSeleccionado.nombre 
        })
      })

      setPaso(5)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">Reserva en CitaPro</h1>

        {paso === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-700">1. ¿Qué servicio necesitas?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {servicios.map(s => (
                <button key={s.id} onClick={() => { setServicioSeleccionado(s); setPaso(2) }} className="p-4 border rounded-2xl text-left hover:border-blue-600 hover:shadow-md transition-all">
                  <p className="font-bold text-gray-800">{s.nombre}</p>
                  <p className="text-sm text-gray-500">${s.precio} • {s.duracion} min</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <button onClick={() => setPaso(1)} className="text-sm text-blue-600 font-bold mb-4">← Volver</button>
            <h2 className="text-xl font-bold text-gray-700">2. Elige a un profesional</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trabajadores.map(t => (
                <button key={t.id} onClick={() => { setTrabajadorSeleccionado(t); setPaso(3) }} className="p-4 border rounded-2xl text-left hover:border-blue-600 hover:shadow-md transition-all">
                  <p className="font-bold text-gray-800">{t.nombre}</p>
                  <p className="text-sm text-gray-500">{t.especialidad}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <button onClick={() => setPaso(2)} className="text-sm text-blue-600 font-bold mb-4">← Volver</button>
            <h2 className="text-xl font-bold text-gray-700">3. Selecciona Fecha y Hora</h2>
            <input 
              type="date" 
              min={new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota' }).split(',')[0]} 
              onChange={e => setFechaSeleccionada(e.target.value)} 
              className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white"
            />
            
            {fechaSeleccionada && (
              <div className="mt-4">
                {cargandoHoras ? (
                  <p className="text-sm text-gray-500 text-center py-4">Calculando horarios...</p>
                ) : horasLibres.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {horasLibres.map(hora => (
                      <button key={hora} onClick={() => { setHoraSeleccionada(hora); setPaso(4) }} className="py-2 rounded-xl text-sm font-bold border bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
                        {hora}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-500 font-medium text-center py-4">No hay horarios disponibles.</p>
                )}
              </div>
            )}
          </div>
        )}

        {paso === 4 && (
          <form onSubmit={confirmarReserva} className="space-y-4">
            <button type="button" onClick={() => setPaso(3)} className="text-sm text-blue-600 font-bold mb-4">← Volver</button>
            <h2 className="text-xl font-bold text-gray-700">4. Tus Datos</h2>
            <input type="text" placeholder="Nombre completo" required onChange={e => setCliente({...cliente, nombre: e.target.value})} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white" />
            <input type="tel" placeholder="Teléfono" required onChange={e => setCliente({...cliente, telefono: e.target.value})} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white" />
            <input type="email" placeholder="Correo electrónico" required onChange={e => setCliente({...cliente, email: e.target.value})} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white" />
            <button type="submit" disabled={cargando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
              {cargando ? 'Procesando...' : 'Confirmar Reserva'}
            </button>
          </form>
        )}

        {paso === 5 && (
          <div className="text-center py-10 space-y-6">
            <div className="text-6xl mb-2 animate-bounce">✅</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Cita Confirmada!</h2>
              <p className="text-gray-600">Te hemos enviado un correo con los detalles.</p>
            </div>

            <button
              onClick={() => {
                const telefonoNegocio = "573005980054"; // CAMBIA ESTO POR EL REAL
                const mensaje = `¡Hola! 👋 Confirmación de cita en CitaPro:\n\n` +
                  `• Servicio: ${servicioSeleccionado?.nombre}\n` +
                  `• Fecha: ${fechaSeleccionada}\n` +
                  `• Hora: ${horaSeleccionada}\n` +
                  `• Cliente: ${cliente.nombre}\n\n` +
                  `¡Quedo atento!`;
                
                const url = `https://wa.me/${telefonoNegocio}?text=${encodeURIComponent(mensaje)}`;
                window.open(url, "_blank");
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
            >
              💬 Enviar confirmación a WhatsApp
            </button>

            <button onClick={() => window.location.reload()} className="text-gray-500 font-medium hover:text-blue-600 transition-colors">
              Hacer otra reserva
            </button>
          </div>
        )}
      </div>
    </main>
  )
}