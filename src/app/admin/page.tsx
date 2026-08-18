'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CitaConDetalles {
  id: string
  fecha_inicio: string
  estado: string
  precio_congelado: number
  clientes: {
    nombre: string
    telefono: string
  }
  servicios: {
    nombre: string
  }
  trabajadores: {
    nombre: string
    especialidad: string
  } | null
}

export default function AdminDashboard() {
  const [sesion, setSesion] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [citas, setCitas] = useState<CitaConDetalles[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoAuth, setCargandoAuth] = useState(true)

  useEffect(() => {
    // Verificar si hay una sesión activa en Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session)
      if (session) cargarCitas()
      setCargandoAuth(false)
    })

    // Escuchar cambios de autenticación (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
      if (session) cargarCitas()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function manejarLogin(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Error al iniciar sesión: ' + error.message)
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setSesion(null)
    setCitas([])
  }

  async function cargarCitas() {
    setCargando(true)
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id,
        fecha_inicio,
        estado,
        precio_congelado,
        clientes ( nombre, telefono ),
        servicios ( nombre ),
        trabajadores ( nombre, especialidad )
      `)
      .order('fecha_inicio', { ascending: false })

    if (error) {
      alert('Error al cargar citas: ' + error.message)
    } else if (data) {
      setCitas(data as unknown as CitaConDetalles[])
    }
    setCargando(false)
  }

  async function actualizarEstado(id: string, nuevoEstado: string) {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      alert('Error al actualizar estado: ' + error.message)
    } else {
      cargarCitas()
    }
  }

  if (cargandoAuth) {
    return <div className="text-center py-20 text-gray-500">Verificando sesión...</div>
  }

  // Si no ha iniciado sesión, mostrar formulario de Supabase Auth
  if (!sesion) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">CitaPro Admin</h1>
          <p className="text-center text-gray-500 mb-6 text-sm">Inicia sesión con tus credenciales</p>
          
          <form onSubmit={manejarLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm mt-2"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Panel de administración protegido
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard de Citas</h1>
            <p className="text-gray-500 text-sm">Conectado como: {sesion.user.email}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={cargarCitas} 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              🔄 Recargar
            </button>
            <button 
              onClick={cerrarSesion} 
              className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-20 text-gray-500">Cargando reservas...</div>
        ) : citas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 text-gray-500">
            No hay citas registradas por el momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {citas.map(cita => {
              const fechaFormateada = new Date(cita.fecha_inicio).toLocaleString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })

              let colorEstado = 'bg-gray-100 text-gray-800 border-gray-200'
              if (cita.estado === 'confirmada') colorEstado = 'bg-blue-50 text-blue-700 border-blue-200'
              if (cita.estado === 'completada') colorEstado = 'bg-green-50 text-green-700 border-green-200'
              if (cita.estado === 'cancelada') colorEstado = 'bg-red-50 text-red-700 border-red-200'
              if (cita.estado === 'pendiente') colorEstado = 'bg-amber-50 text-amber-700 border-amber-200'

              return (
                <div key={cita.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className={`px-5 py-3 border-b flex justify-between items-center text-xs font-bold uppercase tracking-wider ${colorEstado}`}>
                      <span>{cita.estado}</span>
                      <span>{fechaFormateada}</span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{cita.clientes?.nombre || 'Cliente'}</h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1">
                          📞 {cita.clientes?.telefono || 'Sin teléfono'}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                        <p className="font-bold text-gray-800">{cita.servicios?.nombre || 'Servicio'}</p>
                        <p className="text-gray-600 text-xs">
                          Profesional: {cita.trabajadores ? cita.trabajadores.nombre : 'Cualquiera'}
                        </p>
                        <p className="text-emerald-600 font-bold text-sm">
                          Total: ${cita.precio_congelado}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => actualizarEstado(cita.id, 'confirmada')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => actualizarEstado(cita.id, 'completada')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Completar
                    </button>
                    <button 
                      onClick={() => actualizarEstado(cita.id, 'cancelada')}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}