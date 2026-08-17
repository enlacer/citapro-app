'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Categoria {
  id: string
  nombre: string
  descripcion: string
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

export default function Inicio() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<string>('')
  
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [fechaCita, setFechaCita] = useState('')

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
    if (!servicioSeleccionado) return

    // 1. Crear o buscar cliente
    let clienteId = null
    const { data: clienteExistente } = await supabase.from('clientes').select('id').eq('telefono', clienteTelefono).single()

    if (clienteExistente) {
      clienteId = clienteExistente.id
    } else {
      const { data: nuevoCliente, error: errCliente } = await supabase.from('clientes').insert([
        { nombre: clienteNombre, telefono: clienteTelefono }
      ]).select('id').single()

      if (errCliente) return alert('Error al registrar cliente: ' + errCliente.message)
      clienteId = nuevoCliente.id
    }

    // 2. Registrar Cita
    const { error: errCita } = await supabase.from('citas').insert([
      {
        cliente_id: clienteId,
        servicio_id: servicioSeleccionado.id,
        trabajador_id: trabajadorSeleccionado || null,
        fecha: fechaCita,
        estado: 'pendiente'
      }
    ])

    if (errCita) {
      alert('Error al agendar la cita: ' + errCita.message)
    } else {
      alert('¡Tu cita ha sido agendada con éxito!')
      setServicioSeleccionado(null)
      setClienteNombre('')
      setClienteTelefono('')
      setFechaCita('')
      setTrabajadorSeleccionado('')
    }
  }

  if (cargando) return <div className="text-center p-10">Cargando catálogo...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">CitaPro</h1>
        <p className="text-center text-gray-500 mb-10">Reserva tu espacio de belleza y cuidado</p>

        {!categoriaSeleccionada ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {categorias.map(categoria => (
              <button 
                key={categoria.id} 
                onClick={() => setCategoriaSeleccionada(categoria)}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{categoria.nombre}</h2>
                <p className="text-gray-500">{categoria.descripcion}</p>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button 
              onClick={() => {
                setCategoriaSeleccionada(null)
                setServicioSeleccionado(null)
              }} 
              className="mb-6 text-blue-600 font-medium hover:underline flex items-center gap-2"
            >
              ← Volver a categorías
            </button>
            
            <h2 className="text-3xl font-bold mb-6 text-gray-800">{categoriaSeleccionada.nombre}</h2>

            {!servicioSeleccionado ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {servicios.filter(s => s.categoria_id === categoriaSeleccionada.id).map(servicio => (
                  <div key={servicio.id} className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{servicio.nombre}</h3>
                      <p className="text-gray-600">${servicio.precio} - {servicio.duracion} min</p>
                    </div>
                    <button 
                      onClick={() => setServicioSeleccionado(servicio)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
                    >
                      Reservar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Formulario de reserva con selección de trabajador */
              <div className="bg-white p-6 rounded-xl shadow-md max-w-lg mx-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Completar Reserva: {servicioSeleccionado.nombre}</h3>
                <form onSubmit={agendarCita} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tu Nombre</label>
                    <input 
                      type="text" 
                      required 
                      value={clienteNombre} 
                      onChange={e => setClienteNombre(e.target.value)} 
                      className="w-full border rounded-lg p-2 mt-1" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono / WhatsApp</label>
                    <input 
                      type="text" 
                      required 
                      value={clienteTelefono} 
                      onChange={e => setClienteTelefono(e.target.value)} 
                      className="w-full border rounded-lg p-2 mt-1" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Seleccionar Profesional (Opcional)</label>
                    <select 
                      value={trabajadorSeleccionado} 
                      onChange={e => setTrabajadorSeleccionado(e.target.value)}
                      className="w-full border rounded-lg p-2 mt-1 bg-white"
                    >
                      <option value="">Cualquier profesional disponible</option>
                      {trabajadores.map(trab => (
                        <option key={trab.id} value={trab.id}>
                          {trab.nombre} ({trab.especialidad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha y Hora</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={fechaCita} 
                      onChange={e => setFechaCita(e.target.value)} 
                      className="w-full border rounded-lg p-2 mt-1" 
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setServicioSeleccionado(null)}
                      className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg"
                    >
                      Confirmar Cita
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}