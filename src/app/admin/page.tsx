'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Cita {
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
}

export default function AdminDashboard() {
  // Estados de Autenticación
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [verificandoSesion, setVerificandoSesion] = useState(true)

  // Estados del Dashboard
  const [citas, setCitas] = useState<Cita[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(false)

  // 1. Verificar sesión al cargar la página
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setVerificandoSesion(false)
      if (session) cargarCitas()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) cargarCitas()
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Función de Inicio de Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert('Error de acceso: Verifica tus credenciales.')
      console.error(error)
    }
    setLoginLoading(false)
  }

  // 3. Función de Cerrar Sesión
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCitas([])
  }

  const cargarCitas = async () => {
    setCargandoDatos(true)
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id,
        fecha_inicio,
        estado,
        precio_congelado,
        clientes ( nombre, telefono ),
        servicios ( nombre )
      `)
      .order('fecha_inicio', { ascending: true })

    if (!error) {
      // @ts-ignore
      setCitas(data || [])
    }
    setCargandoDatos(false)
  }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (!error) cargarCitas()
  }

  const formatearFecha = (fechaIso: string) => {
    return new Date(fechaIso).toLocaleString('es-CO', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    })
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completada': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'cancelada': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  // PANTALLA DE CARGA INICIAL
  if (verificandoSesion) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando seguridad...</div>
  }

  // PANTALLA DE LOGIN (Si no hay sesión)
  if (!session) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-200 animate-in zoom-in-95">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">CitaPro Admin</h1>
            <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" placeholder="admin@citapro.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loginLoading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition">
              {loginLoading ? 'Verificando...' : 'Acceder al Panel'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // PANTALLA DEL DASHBOARD (Si está logueado)
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
            <p className="text-slate-500 text-sm mt-1">Usuario activo: {session.user.email}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={cargarCitas} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
              ↻ Actualizar
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition">
              Cerrar Sesión
            </button>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {cargandoDatos ? (
            <div className="p-10 text-center text-slate-500">Cargando la agenda de citas...</div>
          ) : citas.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No hay citas registradas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-4 font-semibold">Fecha y Hora</th>
                    <th className="p-4 font-semibold">Cliente</th>
                    <th className="p-4 font-semibold">Servicio</th>
                    <th className="p-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {citas.map((cita) => (
                    <tr key={cita.id} className="hover:bg-slate-50">
                      <td className="p-4 whitespace-nowrap text-slate-900 font-medium">
                        {formatearFecha(cita.fecha_inicio)}
                        <div className="mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getEstadoColor(cita.estado)}`}>
                            {cita.estado}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{cita.clientes.nombre}</div>
                        <div className="text-sm text-slate-500">{cita.clientes.telefono}</div>
                      </td>
                      <td className="p-4 text-slate-700">
                        {cita.servicios.nombre}
                        <div className="text-emerald-600 font-semibold text-sm mt-0.5">
                          ${Number(cita.precio_congelado).toLocaleString('es-CO')}
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {cita.estado !== 'completada' && (
                          <button onClick={() => cambiarEstado(cita.id, 'completada')} className="text-xs font-medium px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition">
                            ✓ Completar
                          </button>
                        )}
                        {cita.estado !== 'cancelada' && (
                          <button onClick={() => cambiarEstado(cita.id, 'cancelada')} className="text-xs font-medium px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition">
                            ✕ Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}