'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Categoria {
  id: string
  nombre: string
}

interface Servicio {
  id?: string
  nombre: string
  precio: number
  duracion: number
  categoria_id: string
}

export default function AdminPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  // Estado del formulario para crear un servicio
  const [nuevoServicio, setNuevoServicio] = useState<Servicio>({
    nombre: '',
    precio: 0,
    duracion: 30,
    categoria_id: ''
  })

  useEffect(() => {
    cargarAdminDatos()
  }, [])

  async function cargarAdminDatos() {
    // Cargar categorías disponibles
    const { data: catData } = await supabase.from('categorias').select('*').eq('activo', true)
    // Cargar servicios junto con el nombre de su categoría asociada
    const { data: servData } = await supabase.from('servicios').select('*, categorias(nombre)')

    if (catData) {
      setCategorias(catData)
      if (catData.length > 0) {
        setNuevoServicio(prev => ({ ...prev, categoria_id: catData[0].id }))
      }
    }
    if (servData) setServicios(servData)
    setCargando(false)
  }

  async function guardarServicio(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoServicio.categoria_id) {
      alert('Selecciona una categoría obligatoriamente')
      return
    }

    const { error } = await supabase.from('servicios').insert([
      {
        nombre: nuevoServicio.nombre,
        precio: nuevoServicio.precio,
        duracion: nuevoServicio.duracion,
        categoria_id: nuevoServicio.categoria_id,
        activo: true
      }
    ])

    if (error) {
      alert('Error al guardar el servicio: ' + error.message)
    } else {
      alert('¡Servicio agregado con éxito!')
      setNuevoServicio({
        nombre: '',
        precio: 0,
        duracion: 30,
        categoria_id: categorias[0]?.id || ''
      })
      cargarAdminDatos()
    }
  }

  if (cargando) return <div className="p-10 text-center">Cargando Panel de Administración...</div>

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Panel de Administración - CitaPro</h1>

        {/* Formulario de creación de nuevos servicios */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Agregar Nuevo Servicio</h2>
          <form onSubmit={guardarServicio} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio</label>
              <input
                type="text"
                required
                value={nuevoServicio.nombre}
                onChange={e => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                className="w-full border rounded-lg p-2"
                placeholder="Ej. Manicura Semipermanente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría / Área</label>
              <select
                value={nuevoServicio.categoria_id}
                onChange={e => setNuevoServicio({ ...nuevoServicio, categoria_id: e.target.value })}
                className="w-full border rounded-lg p-2 bg-white"
              >
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
              <input
                type="number"
                required
                value={nuevoServicio.precio || ''}
                onChange={e => setNuevoServicio({ ...nuevoServicio, precio: Number(e.target.value) })}
                className="w-full border rounded-lg p-2"
                placeholder="35000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (Minutos)</label>
              <input
                type="number"
                required
                value={nuevoServicio.duracion || ''}
                onChange={e => setNuevoServicio({ ...nuevoServicio, duracion: Number(e.target.value) })}
                className="w-full border rounded-lg p-2"
                placeholder="45"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Guardar Servicio
              </button>
            </div>
          </form>
        </div>

        {/* Tabla / Lista de Servicios Activos */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Catálogo Actual</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3">Servicio</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Duración</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map(serv => (
                  <tr key={serv.id} className="border-b">
                    <td className="p-3 font-medium">{serv.nombre}</td>
                    <td className="p-3 text-blue-600 font-medium">
                      {serv.categorias?.nombre || 'Sin Categoría'}
                    </td>
                    <td className="p-3">${serv.precio}</td>
                    <td className="p-3">{serv.duracion} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}