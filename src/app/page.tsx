'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Actualizamos nuestras interfaces
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

export default function Inicio() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    // Traemos tanto categorías como servicios activos
    const { data: catData } = await supabase.from('categorias').select('*').eq('activo', true)
    const { data: servData } = await supabase.from('servicios').select('*').eq('activo', true)
    
    if (catData) setCategorias(catData)
    if (servData) setServicios(servData)
    setCargando(false)
  }

  if (cargando) return <div className="text-center p-10">Cargando catálogo de servicios...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">CitaPro</h1>
        <p className="text-center text-gray-500 mb-10">Reserva tu espacio con nosotros</p>

        {/* Si NO hay categoría seleccionada, mostramos las 4 áreas */}
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
          /* Si YA SELECCIONARON una categoría, mostramos sus servicios */
          <div className="animate-fade-in">
            <button 
              onClick={() => setCategoriaSeleccionada(null)} 
              className="mb-6 text-blue-600 font-medium hover:underline flex items-center gap-2"
            >
              ← Volver a categorías
            </button>
            
            <h2 className="text-3xl font-bold mb-6 text-gray-800">{categoriaSeleccionada.nombre}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtramos los servicios para que solo salgan los de esta categoría */}
              {servicios.filter(s => s.categoria_id === categoriaSeleccionada.id).map(servicio => (
                <div key={servicio.id} className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{servicio.nombre}</h3>
                    <p className="text-gray-600">${servicio.precio} - {servicio.duracion} min</p>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors">
                    Reservar
                  </button>
                </div>
              ))}
              
              {/* Mensaje por si la categoría aún no tiene servicios asignados */}
              {servicios.filter(s => s.categoria_id === categoriaSeleccionada.id).length === 0 && (
                <p className="text-gray-500 col-span-full">Aún no hay servicios en esta área.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}