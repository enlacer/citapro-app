'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReservarCita() {
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(false)

  const [servicios, setServicios] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])

  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any>(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('')
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('')
  
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', email: '' })

  const horasDisponibles = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  useEffect(() => {
    if (fechaSeleccionada && trabajadorSeleccionado) {
      verificarDisponibilidad()
    }
  }, [fechaSeleccionada, trabajadorSeleccionado])

  async function cargarDatosIniciales() {
    const { data: servs } = await supabase.from('servicios').select('*').eq('activo', true)
    const { data: trabs } = await supabase.from('trabajadores').select('*').eq('activo', true)
    if (servs) setServicios(servs)
    if (trabs) setTrabajadores(trabs)
  }

  async function verificarDisponibilidad() {
    const fechaInicio = `${fechaSeleccionada}T00:00:00`
    const fechaFin = `${fechaSeleccionada}T23:59:59`

    const { data: citasExistentes } = await supabase
      .from('citas')
      .select('fecha_inicio')
      .eq('trabajador_id', trabajadorSeleccionado.id)
      .neq('estado', 'cancelada')
      .gte('fecha_inicio', fechaInicio)
      .lte('fecha_inicio', fechaFin)

    if (citasExistentes) {
      const ocupadas = citasExistentes.map(cita => {
        const date = new Date(cita.fecha_inicio)
        return date.toTimeString().slice(0, 5)
      })
      setHorasOcupadas(ocupadas)
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
        const { error: errUpd } = await supabase
          .from('clientes')
          .update({ email: cliente.email, nombre: cliente.nombre })
          .eq('id', clienteId)
        if (errUpd) throw new Error('Error al actualizar cliente: ' + errUpd.message)
      } else {
        const { data: nuevoCliente, error: errCli } = await supabase
          .from('clientes')
          .insert([cliente])
          .select()
          .single()
        
        if (errCli) throw new Error('Error al registrar cliente: ' + errCli.message)
        clienteId = nuevoCliente.id
      }

      const fechaInicioObj = new Date(`${fechaSeleccionada}T${horaSeleccionada}:00`)
      const duracionMinutos = servicioSeleccionado.duracion || 30
      const fechaFinObj = new Date(fechaInicioObj.getTime() + duracionMinutos * 60000)

      const fechaHoraISO = fechaInicioObj.toISOString()
      const fechaFinISO = fechaFinObj.toISOString()

      const { error: errCita } = await supabase.from('citas').insert([{
        cliente_id: clienteId,
        servicio_id: servicioSeleccionado.id,
        trabajador_id: trabajadorSeleccionado.id,
        fecha_inicio: fechaHoraISO,
        fecha_fin: fechaFinISO,
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
              min={new Date().toISOString().split('T')[0]} 
              onChange={e => setFechaSeleccionada(e.target.value)} 
              className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white"
            />
            
            {fechaSeleccionada && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {horasDisponibles.map(hora => {
                  const estaOcupada = horasOcupadas.includes(hora)
                  return (
                    <button 
                      key={hora} 
                      disabled={estaOcupada}
                      onClick={() => { setHoraSeleccionada(hora); setPaso(4) }} 
                      className={`py-2 rounded-xl text-sm font-bold border transition-colors ${estaOcupada ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                    >
                      {hora}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {paso === 4 && (
          <form onSubmit={confirmarReserva} className="space-y-4">
            <button type="button" onClick={() => setPaso(3)} className="text-sm text-blue-600 font-bold mb-4">← Volver</button>
            <h2 className="text-xl font-bold text-gray-700">4. Tus Datos</h2>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
              <p className="text-sm text-blue-800"><strong>Resumen:</strong> {servicioSeleccionado?.nombre} con {trabajadorSeleccionado?.nombre}</p>
              <p className="text-sm text-blue-800"><strong>Cuándo:</strong> {fechaSeleccionada} a las {horaSeleccionada}</p>
            </div>

            <input type="text" placeholder="Nombre completo" required onChange={e => setCliente({...cliente, nombre: e.target.value})} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white" />
            <input type="tel" placeholder="Teléfono (Ej: 3101234567)" required onChange={e => setCliente({...cliente, telefono: e.target.value})} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white" />
            <input type="email" placeholder="Correo electrónico" required onChange={e => setCliente({...cliente, email: e.target.value})} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 bg-white" />
            
            <button type="submit" disabled={cargando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
              {cargando ? 'Procesando...' : 'Confirmar Reserva'}
            </button>
          </form>
        )}

        {paso === 5 && (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Cita Confirmada!</h2>
            <p className="text-gray-600 mb-6">Te hemos enviado un correo con los detalles.</p>
            <button onClick={() => window.location.reload()} className="text-blue-600 font-bold underline">Hacer otra reserva</button>
          </div>
        )}
      </div>
    </main>
  )
}