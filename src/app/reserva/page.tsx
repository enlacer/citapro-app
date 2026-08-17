'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Categoria {
  id: string
  nombre: string
}

interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion: number
  categoria_id: string
}

interface Trabajador {
  id: string
  nombre: string
  especialidad: string
}

export default function ReservaPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [servicioSeleccionado, setServicioSeleccionado] = useState('')
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('09:00')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  
  const [confirmado, setConfirmado] = useState(false)
  const [reservaInfo, setReservaInfo] = useState<any>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    async function cargarDatos() {
      const { data: catData } = await supabase.from('categorias').select('*').eq('activo', true)
      const { data: servData } = await supabase.from('servicios').select('*').eq('activo', true)
      const { data: trabData } = await supabase.from('trabajadores').select('*').eq('activo', true)

      if (catData) {
        setCategorias(catData)
        if (catData.length > 0) setCategoriaSeleccionada(catData[0].id)
      }
      if (servData) setServicios(servData)
      if (trabData) setTrabajadores(trabData)
    }
    cargarDatos()
  }, [])

  const serviciosFiltrados = servicios.filter(s => s.categoria_id === categoriaSeleccionada)

  async function handleReserva(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)

    const servicioObj = servicios.find(s => s.id === servicioSeleccionado)
    const trabajadorObj = trabajadores.find(t => t.id === trabajadorSeleccionado)
    const fechaHoraStr = `${fecha}T${hora}:00`

    const { data, error } = await supabase
      .from('citas')
      .insert([
        {
          servicio_id: servicioSeleccionado,
          trabajador_id: trabajadorSeleccionado || null,
          fecha: fechaHoraStr,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          estado: 'confirmada'
        }
      ])
      .select()

    setCargando(false)

    if (error) {
      alert('Error al agendar la cita: ' + error.message)
    } else {
      setReservaInfo({
        servicio: servicioObj?.nombre,
        precio: servicioObj?.precio,
        trabajador: trabajadorObj ? trabajadorObj.nombre : 'Asignación automática',
        fecha,
        hora,
        clienteNombre,
        clienteTelefono
      })
      setConfirmado(true)
    }
  }

  function obtenerEnlaceWhatsApp() {
    if (!reservaInfo) return '#'
    const mensaje = `¡Hola ${reservaInfo.clienteNombre}! 🗓️ Tu cita en CitaPro ha sido agendada con éxito.\n\n` +
      `📌 *Servicio:* ${reservaInfo.servicio}\n` +
      `👤 *Profesional:* ${reservaInfo.trabajador}\n` +
      `📅 *Fecha:* ${reservaInfo.fecha}\n` +
      `⏰ *Hora:* ${reservaInfo.hora}\n` +
      `💰 *Total:* $${reservaInfo.precio}\n\n` +
      `¡Te esperamos!`

    const numeroNegocio = '573000000000'
    return `https://wa.me/${numeroNegocio}?text=${encodeURIComponent(mensaje)}`
  }

  if (confirmado && reservaInfo) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-800">¡Cita Confirmada!</h2>
          
          <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2 text-sm text-gray-700">
            <p><strong>Servicio:</strong> {reservaInfo.servicio}</p>
            <p><strong>Profesional:</strong> {reservaInfo.trabajador}</p>
            <p><strong>Fecha:</strong> {reservaInfo.fecha} a las {reservaInfo.hora}</p>
            <p><strong>Cliente:</strong> {reservaInfo.clienteNombre}</p>
          </div>

          <a
            href={obtenerEnlaceWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-green-200"
          >
            Enviar Confirmación por WhatsApp 📲
          </a>

          <button
            onClick={() => setConfirmado(false)}
            className="text-sm text-gray-500 hover:text-gray-700 underline block mx-auto"
          >
            Agendar otra cita
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-xl w-full space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Agendar tu Cita</h1>
        
        <form onSubmit={handleReserva} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={e => setCategoriaSeleccionada(e.target.value)}
              className="w-full border rounded-lg p-2.5 bg-white"
            >
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select
              value={servicioSeleccionado}
              onChange={e => setServicioSeleccionado(e.target.value)}
              required
              className="w-full border rounded-lg p-2.5 bg-white"
            >
              <option value="">-- Selecciona un Servicio --</option>
              {serviciosFiltrados.map(serv => (
                <option key={serv.id} value={serv.id}>{serv.nombre} (${serv.precio})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profesional (Opcional)</label>
            <select
              value={trabajadorSeleccionado}
              onChange={e => setTrabajadorSeleccionado(e.target.value)}
              className="w-full border rounded-lg p-2.5 bg-white"
            >
              <option value="">Cualquiera disponible</option>
              {trabajadores.map(trab => (
                <option key={trab.id} value={trab.id}>{trab.nombre} - {trab.especialidad}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                required
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre Completo</label>
            <input
              type="text"
              required
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Ej. Carlos Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Teléfono</label>
            <input
              type="tel"
              required
              value={clienteTelefono}
              onChange={e => setClienteTelefono(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Ej. 3001234567"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {cargando ? 'Procesando...' : 'Confirmar Cita'}
          </button>
        </form>
      </div>
    </main>
  )
}