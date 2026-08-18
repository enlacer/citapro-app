'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Interfaces estrictas para evitar errores de TypeScript (Margen de error 0)
interface Cita {
  id: string
  fecha_inicio: string
  estado: string
  precio_congelado: number
  cliente_id: string
  servicio_id: string
  trabajador_id: string
}

interface Cliente { id: string; nombre: string; telefono: string }
interface Servicio { id: string; nombre: string }
interface Trabajador { id: string; nombre: string }

export default function AdminDashboard() {
  // Estado de seguridad básica
  const [autenticado, setAutenticado] = useState(false)
  const [pin, setPin] = useState('')

  // Estados de datos
  const [citas, setCitas] = useState<(Cita & { cliente?: Cliente; servicio?: Servicio; trabajador?: Trabajador })[]>([])
  const [cargando, setCargando] = useState(false)

  // Función de ingreso seguro
  function login(e: React.FormEvent) {
    e.preventDefault()
    if (pin === '2026') { // PIN TEMPORAL DE SEGURIDAD
      setAutenticado(true)
      cargarDashboard()
    } else {
      alert('PIN Incorrecto. Acceso denegado.')
    }
  }

  async function cargarDashboard() {
    setCargando(true)
    
    // Extracción independiente para cruce a prueba de fallos de llaves foráneas
    const { data: citasData } = await supabase.from('citas').select('*').order('fecha_inicio', { ascending: true })
    const { data: clientesData } = await supabase.from('clientes').select('*')
    const { data: serviciosData } = await supabase.from('servicios').select('*')
    const { data: trabajadoresData } = await supabase.from('trabajadores').select('*')

    if (citasData && clientesData && serviciosData) {
      // Cruce de datos seguro (Calculo y validación de referencias nulas)
      const citasCompletas = citasData.map((cita: Cita) => {
        return {
          ...cita,
          cliente: clientesData.find(c => c.id === cita.cliente_id),
          servicio: serviciosData.find(s => s.id === cita.servicio_id),
          trabajador: trabajadoresData?.find(t => t.id === cita.trabajador_id)
        }
      })
      setCitas(citasCompletas)
    }
    setCargando(false)
  }

  async function cambiarEstado(idCita: string, nuevoEstado: string) {
    // Validación contra la base de datos
    const { error } = await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', idCita)
    
    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      // Reflejar cambio en la UI instantáneamente sin recargar
      setCitas(citas.map(c => c.id === idCita ? { ...c, estado: nuevoEstado } : c))
    }
  }

  // Interfaz de Autenticación
  if (!autenticado) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={login} className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">CitaPro Admin</h1>
          <input 
            type="password" 
            placeholder="Ingresa el PIN de seguridad" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full border-2 rounded-lg p-3 text-center text-xl tracking-[0.5em] mb-4 focus:border-blue-500 outline-none"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">Entrar</button>
        </form>
      </main>
    )
  }

  // Interfaz del Dashboard
  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard de Citas</h1>
          <button onClick={cargarDashboard} className="bg-white shadow px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:text-blue-600">
            ↻ Recargar
          </button>
        </div>

        {cargando ? (
          <div className="text-center p-10 text-gray-500">Cargando base de datos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {citas.map(cita => {
              // Validaciones visuales y formateo seguro de fechas
              const fechaObj = new Date(cita.fecha_inicio)
              const fechaLocal = fechaObj.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
              const horaLocal = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              
              // Colores dinámicos de estado
              const colorEstado = 
                cita.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                cita.estado === 'confirmada' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                cita.estado === 'completada' ? 'bg-green-100 text-green-800 border-green-200' :
                'bg-red-100 text-red-800 border-red-200'

              return (
                <div key={cita.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`px-4 py-2 border-b flex justify-between items-center ${colorEstado}`}>
                    <span className="font-bold text-sm uppercase">{cita.estado}</span>
                    <span className="text-sm font-semibold">{fechaLocal} - {horaLocal}</span>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold text-xl text-gray-800">{cita.cliente?.nombre || 'Cliente Borrado'}</h3>
                    <p className="text-gray-500 text-sm mb-4">📞 {cita.cliente?.telefono || 'N/A'}</p>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                      <p className="font-medium text-gray-800">{cita.servicio?.nombre || 'Servicio No Definido'}</p>
                      <p className="text-sm text-gray-500">Profesional: {cita.trabajador?.nombre || 'Cualquiera'}</p>
                      <p className="text-sm font-bold text-green-600 mt-1">Total: ${cita.precio_congelado}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => cambiarEstado(cita.id, 'confirmada')} className="bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded font-medium text-sm">
                        ✅ Confirmar
                      </button>
                      <button onClick={() => cambiarEstado(cita.id, 'completada')} className="bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded font-medium text-sm">
                        💰 Completar
                      </button>
                      <button onClick={() => cambiarEstado(cita.id, 'cancelada')} className="col-span-2 bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded font-medium text-sm">
                        ❌ Cancelar Cita
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {citas.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-medium">Aún no tienes citas registradas.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}