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

  const [categoriaId, setCategoriaId] = useState('')
  const [servicioId, setServicioId] = useState('')
  const [trabajadorId, setTrabajadorId] = useState('')
  
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')

  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const { data: catData } = await supabase.from('categorias').select('*').eq('activo', true)
    const { data: servData } = await supabase.from('servicios').select('*').eq('activo', true)
    const { data: trabData } = await supabase.from('trabajadores').select('*').eq('activo', true)

    if (catData) setCategorias(catData)
    if (servData) setServicios(servData)
    if (trabData) setTrabajadores(trabData)
    setCargando(false)
  }

  async function agendarCita(e: React.FormEvent) {
    e.preventDefault()

    const servicioSeleccionado = servicios.find(s => s.id === servicioId)
    if (!servicioSeleccionado) {
      alert('Por favor selecciona un servicio válido.')
      return
    }

    // 1. Manejo del Cliente (Consulta o Registro sin enviar cliente_nombre a la tabla citas)
    let clienteId = null
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefono', clienteTelefono)
      .maybeSingle()

    if (clienteExistente) {
      clienteId = clienteExistente.id
    } else {
      const { data: nuevoCliente, error: errCliente } = await supabase
        .from('clientes')
        .insert([{ nombre: clienteNombre, telefono: clienteTelefono }])
        .select('id')
        .single()

      if (errCliente) return alert('Error al registrar cliente: ' + errCliente.message)
      clienteId = nuevoCliente.id
    }

    // 2. Cálculo de fechainicio, fecha_fin y precio_congelado
    const fechaInicioDate = new Date(`${fecha}T${hora}:00`)
    const duracionMinutos = servicioSeleccionado.duracion || 30
    const fechaFinDate = new Date(fechaInicioDate.getTime() + duracionMinutos * 60000)

    // 3. Inserción limpia a la tabla citas
    const { error: errCita } = await supabase.from('citas').insert([
      {
        cliente_id: clienteId,
        servicio_id: servicioSeleccionado.id,
        trabajador_id: trabajadorId || null,
        fecha_inicio: fechaInicioDate.toISOString(),
        fecha_fin: fechaFinDate.toISOString(),
        precio_congelado: servicioSeleccionado.precio,
        estado: 'pendiente'
      }
    ])

    if (errCita) {
      alert('Error al agendar la cita: ' + errCita.message)
    } else {
      alert('¡Tu cita ha sido agendada con éxito!')
      setCategoriaId('')
      setServicioId('')
      setTrabajadorId('')
      setFecha('')
      setHora('')
      setClienteNombre('')
      setClienteTelefono('')
    }
  }

  if (cargando) return <div className="text-center p-10">Cargando formulario...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-lg w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Agendar tu Cita</h1>

        <form onSubmit={agendarCita} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <select
              value={categoriaId}
              onChange={e => {
                setCategoriaId(e.target.value)
                setServicioId('')
              }}
              required
              className="w-full border rounded-lg p-2 mt-1 bg-white"
            >
              <option value="">-- Selecciona una Categoría --</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Servicio</label>
            <select
              value={servicioId}
              onChange={e => setServicioId(e.target.value)}
              required
              disabled={!categoriaId}
              className="w-full border rounded-lg p-2 mt-1 bg-white disabled:bg-gray-100"
            >
              <option value="">-- Selecciona un Servicio --</option>
              {servicios
                .filter(s => s.categoria_id === categoriaId)
                .map(serv => (
                  <option key={serv.id} value={serv.id}>
                    {serv.nombre} (${serv.precio})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profesional (Opcional)</label>
            <select
              value={trabajadorId}
              onChange={e => setTrabajadorId(e.target.value)}
              className="w-full border rounded-lg p-2 mt-1 bg-white"
            >
              <option value="">Cualquiera disponible</option>
              {trabajadores.map(trab => (
                <option key={trab.id} value={trab.id}>
                  {trab.nombre} ({trab.especialidad})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hora</label>
              <input
                type="time"
                required
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tu Nombre Completo</label>
            <input
              type="text"
              required
              placeholder="Ej. Carlos Pérez"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              className="w-full border rounded-lg p-2 mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Número de Teléfono</label>
            <input
              type="text"
              required
              placeholder="Ej. 3001234567"
              value={clienteTelefono}
              onChange={e => setClienteTelefono(e.target.value)}
              className="w-full border rounded-lg p-2 mt-1"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-2"
          >
            Confirmar Cita
          </button>
        </form>
      </div>
    </main>
  )
}