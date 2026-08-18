'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Trabajador {
  id: string
  nombre: string
  especialidad: string
  activo: boolean
}

interface Categoria {
  id: string
  nombre: string
}

interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion: number
  activo: boolean
  categoria_id: string
}

interface CitaConDetalles {
  id: string
  fecha_inicio: string
  estado: string
  precio_congelado: number
  trabajador_id: string | null
  clientes: {
    nombre: string
    telefono: string
  }
  servicios: {
    nombre: string
  }
  trabajadores: {
    id: string
    nombre: string
    especialidad: string
  } | null
}

export default function AdminDashboard() {
  const [sesion, setSesion] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [pestanaActiva, setPestanaActiva] = useState<'citas' | 'servicios' | 'trabajadores' | 'analitica'>('citas')

  const [citas, setCitas] = useState<CitaConDetalles[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [nuevoTrabajadorNombre, setNuevoTrabajadorNombre] = useState('')
  const [nuevoTrabajadorEspecialidad, setNuevoTrabajadorEspecialidad] = useState('')

  const [nuevoServicioNombre, setNuevoServicioNombre] = useState('')
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState('')
  const [nuevoServicioDuracion, setNuevoServicioDuracion] = useState('')
  const [nuevoServicioCategoria, setNuevoServicioCategoria] = useState('')

  const [editandoServicioId, setEditandoServicioId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editDuracion, setEditDuracion] = useState('')

  const [cargando, setCargando] = useState(false)
  const [cargandoAuth, setCargandoAuth] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session)
      if (session) cargarDatosGenerales()
      setCargandoAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
      if (session) cargarDatosGenerales()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarDatosGenerales() {
    setCargando(true)
    await Promise.all([cargarCitas(), cargarTrabajadores(), cargarServicios(), cargarCategorias()])
    setCargando(false)
  }

  async function cargarCitas() {
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id,
        fecha_inicio,
        estado,
        precio_congelado,
        trabajador_id,
        clientes ( nombre, telefono ),
        servicios ( nombre ),
        trabajadores ( id, nombre, especialidad )
      `)
      .order('fecha_inicio', { ascending: false })

    if (error) alert('Error al cargar citas: ' + error.message)
    else if (data) setCitas(data as unknown as CitaConDetalles[])
  }

  async function cargarTrabajadores() {
    const { data } = await supabase.from('trabajadores').select('*')
    if (data) setTrabajadores(data)
  }

  async function cargarServicios() {
    const { data } = await supabase.from('servicios').select('*')
    if (data) setServicios(data)
  }

  async function cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*')
    if (data) {
      setCategorias(data)
      if (data.length > 0 && !nuevoServicioCategoria) {
        setNuevoServicioCategoria(data[0].id)
      }
    }
  }

  async function manejarLogin(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('Error al iniciar sesión: ' + error.message)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setSesion(null)
    setCitas([])
  }

  async function actualizarEstadoCita(id: string, nuevoEstado: string) {
    const { error } = await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', id)
    if (error) alert('Error al actualizar estado: ' + error.message)
    else cargarCitas()
  }

  async function cambiarTrabajadorCita(citaId: string, nuevoTrabajadorId: string) {
    const trabajadorIdAEnviar = nuevoTrabajadorId === '' ? null : nuevoTrabajadorId
    const { error } = await supabase.from('citas').update({ trabajador_id: trabajadorIdAEnviar }).eq('id', citaId)
    if (error) alert('Error al asignar profesional: ' + error.message)
    else cargarCitas()
  }

  async function toggleTrabajador(id: string, activoActual: boolean) {
    const { error } = await supabase.from('trabajadores').update({ activo: !activoActual }).eq('id', id)
    if (error) alert('Error al actualizar estado: ' + error.message)
    else cargarTrabajadores()
  }

  async function eliminarTrabajador(id: string) {
    if (!confirm('¿Estás seguro de eliminar este profesional? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('trabajadores').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else cargarTrabajadores()
  }

  async function guardarEdicionServicio(id: string) {
    const { error } = await supabase.from('servicios').update({ 
      nombre: editNombre, 
      precio: parseFloat(editPrecio), 
      duracion: parseInt(editDuracion) 
    }).eq('id', id)

    if (error) alert('Error al actualizar: ' + error.message)
    else {
      setEditandoServicioId(null)
      cargarServicios()
    }
  }

  async function eliminarServicio(id: string) {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else cargarServicios()
  }

  async function registrarTrabajador(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoTrabajadorNombre.trim()) return

    const { error } = await supabase.from('trabajadores').insert([
      { nombre: nuevoTrabajadorNombre, especialidad: nuevoTrabajadorEspecialidad, activo: true }
    ])

    if (error) {
      alert('Error al registrar profesional: ' + error.message)
    } else {
      alert('¡Profesional agregado con éxito!')
      setNuevoTrabajadorNombre('')
      setNuevoTrabajadorEspecialidad('')
      cargarTrabajadores()
    }
  }

  async function registrarServicio(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoServicioNombre.trim() || !nuevoServicioPrecio || !nuevoServicioDuracion) return

    const { error } = await supabase.from('servicios').insert([
      {
        nombre: nuevoServicioNombre,
        precio: parseFloat(nuevoServicioPrecio),
        duracion: parseInt(nuevoServicioDuracion),
        categoria_id: nuevoServicioCategoria,
        activo: true
      }
    ])

    if (error) {
      alert('Error al registrar servicio: ' + error.message)
    } else {
      alert('¡Servicio agregado con éxito!')
      setNuevoServicioNombre('')
      setNuevoServicioPrecio('')
      setNuevoServicioDuracion('')
      cargarServicios()
    }
  }

  if (cargandoAuth) {
    return <div className="text-center py-20 text-gray-500">Verificando sesión...</div>
  }

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

  // Cálculos analíticos avanzados
  const totalCitas = citas.length
  const citasCompletadas = citas.filter(c => c.estado === 'completada').length
  const citasConfirmadas = citas.filter(c => c.estado === 'confirmada').length
  const citasPendientes = citas.filter(c => c.estado === 'pendiente').length
  const citasCanceladas = citas.filter(c => c.estado === 'cancelada').length

  const ingresosReales = citas
    .filter(c => c.estado === 'completada')
    .reduce((acc, curr) => acc + (curr.precio_congelado || 0), 0)

  const ingresosEstimados = citas
    .filter(c => c.estado === 'completada' || c.estado === 'confirmada')
    .reduce((acc, curr) => acc + (curr.precio_congelado || 0), 0)

  const tasaExito = totalCitas > 0 ? ((citasCompletadas / totalCitas) * 100).toFixed(1) : '0'
  const tasaCancelacion = totalCitas > 0 ? ((citasCanceladas / totalCitas) * 100).toFixed(1) : '0'
  const ticketPromedio = totalCitas > 0 ? (ingresosEstimados / totalCitas).toFixed(0) : '0'

  // Servicio más solicitado
  const conteoServicios: { [key: string]: number } = {}
  citas.forEach(c => {
    if (c.servicios?.nombre) {
      conteoServicios[c.servicios.nombre] = (conteoServicios[c.servicios.nombre] || 0) + 1
    }
  })
  const servicioMasPopular = Object.entries(conteoServicios).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin datos'

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
            <p className="text-gray-500 text-sm">Conectado como: {sesion.user.email}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={cargarDatosGenerales} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">🔄 Recargar</button>
            <button onClick={cerrarSesion} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-medium transition-colors text-sm">Cerrar Sesión</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
            <button onClick={() => setPestanaActiva('citas')} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${pestanaActiva === 'citas' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>📅 Dashboard de Citas</button>
            <button onClick={() => setPestanaActiva('servicios')} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${pestanaActiva === 'servicios' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>✂️ Catálogo de Servicios</button>
            <button onClick={() => setPestanaActiva('trabajadores')} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${pestanaActiva === 'trabajadores' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>👥 Equipo de Trabajo</button>
            <button onClick={() => setPestanaActiva('analitica')} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${pestanaActiva === 'analitica' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>📊 Analítica y Reportes</button>
        </div>

        {cargando ? (
            <div className="text-center py-20 text-gray-500">Cargando información...</div>
        ) : (
          <>
            {pestanaActiva === 'citas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {citas.map(cita => {
                  const fechaFormateada = new Date(cita.fecha_inicio).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  const estaBloqueada = cita.estado === 'cancelada' || cita.estado === 'completada'
                  let colorEstado = 'bg-gray-100 text-gray-800 border-gray-200'
                  if (cita.estado === 'confirmada') colorEstado = 'bg-blue-50 text-blue-700 border-blue-200'
                  if (cita.estado === 'completada') colorEstado = 'bg-green-50 text-green-700 border-green-200'
                  if (cita.estado === 'cancelada') colorEstado = 'bg-red-50 text-red-700 border-red-200'
                  if (cita.estado === 'pendiente') colorEstado = 'bg-amber-50 text-amber-700 border-amber-200'
                  return (
                    <div key={cita.id} className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between ${estaBloqueada ? 'opacity-80 bg-gray-50' : ''}`}>
                      <div>
                        <div className={`px-5 py-3 border-b flex justify-between items-center text-xs font-bold uppercase tracking-wider ${colorEstado}`}>
                          <span>{cita.estado} {estaBloqueada && '🔒'}</span>
                          <span>{fechaFormateada}</span>
                        </div>
                        <div className="p-5 space-y-3">
                          <h3 className="font-bold text-lg text-gray-900">{cita.clientes?.nombre || 'Cliente'}</h3>
                          <p className="text-gray-500 text-sm flex items-center gap-1">📞 {cita.clientes?.telefono || 'Sin teléfono'}</p>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2">
                            <p className="font-bold text-gray-800">{cita.servicios?.nombre || 'Servicio'}</p>
                            <label className="text-xs text-gray-500 font-medium block">Profesional:</label>
                            <select value={cita.trabajador_id || ''} onChange={(e) => cambiarTrabajadorCita(cita.id, e.target.value)} disabled={estaBloqueada} className="w-full text-xs border rounded-lg p-1.5 bg-white text-gray-700">
                                <option value="">Disponible</option>
                                {trabajadores.map(trab => (<option key={trab.id} value={trab.id}>{trab.nombre} ({trab.especialidad})</option>))}
                            </select>
                            <p className="text-emerald-600 font-bold text-sm">Total: ${cita.precio_congelado}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-2">
                        <button onClick={() => actualizarEstadoCita(cita.id, 'confirmada')} disabled={estaBloqueada} className={`text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 ${estaBloqueada ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}>✅ Confirmar</button>
                        <button onClick={() => actualizarEstadoCita(cita.id, 'completada')} disabled={estaBloqueada} className={`text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 ${estaBloqueada ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}>💰 Completar</button>
                        <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada')} disabled={estaBloqueada} className={`text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 ${estaBloqueada ? 'bg-gray-300' : 'bg-red-600 hover:bg-red-700'}`}>❌ Cancelar</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {pestanaActiva === 'servicios' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Nuevo Servicio</h2>
                  <form onSubmit={registrarServicio} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <input type="text" placeholder="Nombre" value={nuevoServicioNombre} onChange={e => setNuevoServicioNombre(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" required />
                    <input type="number" placeholder="Precio" value={nuevoServicioPrecio} onChange={e => setNuevoServicioPrecio(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" required />
                    <input type="number" placeholder="Minutos" value={nuevoServicioDuracion} onChange={e => setNuevoServicioDuracion(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" required />
                    <select value={nuevoServicioCategoria} onChange={e => setNuevoServicioCategoria(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white">
                        {categorias.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                    </select>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors">Guardar</button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Catálogo Actual</h2>
                  <div className="divide-y">
                    {servicios.map(serv => (
                      <div key={serv.id} className="py-4 flex flex-wrap justify-between items-center gap-4">
                        {editandoServicioId === serv.id ? (
                            <div className="flex flex-wrap gap-2 flex-grow">
                                <input className="border rounded px-2 py-1 text-sm w-32" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                                <input className="border rounded px-2 py-1 text-sm w-20" type="number" value={editPrecio} onChange={e => setEditPrecio(e.target.value)} />
                                <input className="border rounded px-2 py-1 text-sm w-20" type="number" value={editDuracion} onChange={e => setEditDuracion(e.target.value)} />
                                <button onClick={() => guardarEdicionServicio(serv.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Guardar</button>
                                <button onClick={() => setEditandoServicioId(null)} className="bg-gray-400 text-white px-3 py-1 rounded text-xs">X</button>
                            </div>
                        ) : (
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800">{serv.nombre}</p>
                                <p className="text-sm text-gray-500">Duración: {serv.duracion} min | Precio: ${serv.precio}</p>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => { setEditandoServicioId(serv.id); setEditNombre(serv.nombre); setEditPrecio(serv.precio.toString()); setEditDuracion(serv.duracion.toString()) }} className="text-blue-600 hover:underline text-xs font-bold">Editar</button>
                            <button onClick={() => eliminarServicio(serv.id)} className="text-red-600 hover:underline text-xs font-bold">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pestanaActiva === 'trabajadores' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Profesional</h2>
                  <form onSubmit={registrarTrabajador} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <input type="text" placeholder="Nombre" value={nuevoTrabajadorNombre} onChange={e => setNuevoTrabajadorNombre(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" required />
                    <input type="text" placeholder="Especialidad" value={nuevoTrabajadorEspecialidad} onChange={e => setNuevoTrabajadorEspecialidad(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" required />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors">Agregar</button>
                  </form>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Equipo Actual</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trabajadores.map(trab => (
                      <div key={trab.id} className="p-4 border rounded-xl flex justify-between items-center bg-gray-50">
                        <div>
                          <p className="font-bold text-gray-800">{trab.nombre}</p>
                          <p className="text-sm text-gray-500">{trab.especialidad}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                            <button onClick={() => toggleTrabajador(trab.id, trab.activo)} className={`px-3 py-1 rounded-full text-xs font-bold ${trab.activo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {trab.activo ? 'Activo' : 'Ausente'}
                            </button>
                            <button onClick={() => eliminarTrabajador(trab.id)} className="text-red-600 text-xs underline">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pestanaActiva === 'analitica' && (
              <div className="space-y-6">
                {/* Resumen Principal Financiero y de Volumen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Total de Citas</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{totalCitas}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Citas Completadas</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">{citasCompletadas}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Tasa de Éxito / Realización</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{tasaExito}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Ingresos Estimados (Conf. + Comp.)</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">${ingresosEstimados}</p>
                  </div>
                </div>

                {/* Métricas y Desgloses Secundarios */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-800 text-base border-b pb-2">📋 Desglose por Estado</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Confirmadas:</span><span className="font-bold text-blue-600">{citasConfirmadas}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Pendientes:</span><span className="font-bold text-amber-600">{citasPendientes}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Canceladas:</span><span className="font-bold text-red-600">{citasCanceladas}</span></div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-800 text-base border-b pb-2">💰 Finanzas y Promedios</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Ingresos Reales (Completadas):</span><span className="font-bold text-emerald-600">${ingresosReales}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Ticket Promedio por Cita:</span><span className="font-bold text-gray-800">${ticketPromedio}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Tasa de Cancelación:</span><span className="font-bold text-red-600">{tasaCancelacion}%</span></div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-800 text-base border-b pb-2">🏆 Preferencias y Destacados</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Servicio más popular:</span><span className="font-bold text-indigo-600 text-right truncate max-w-[150px]">{servicioMasPopular}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Total de profesionales:</span><span className="font-bold text-gray-800">{trabajadores.length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Total de servicios:</span><span className="font-bold text-gray-800">{servicios.length}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}