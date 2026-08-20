'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  
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

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('todas')
  const [paginaActual, setPaginaActual] = useState(1)
  const citasPorPagina = 9

  useEffect(() => {
    setPaginaActual(1)
  }, [filtroEstado, filtroFecha])

  useEffect(() => {
    async function verificarAccesoAdmin() {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        setSesion(null)
      } else if (user.user_metadata?.role !== 'admin') {
        alert('Acceso denegado: Se requiere perfil de administrador.')
        await supabase.auth.signOut()
        setSesion(null)
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        setSesion(session)
        if (session) cargarDatosGenerales()
      }
      setCargandoAuth(false)
    }

    verificarAccesoAdmin()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.role !== 'admin') {
          alert('Acceso denegado: Se requiere perfil de administrador.')
          await supabase.auth.signOut()
          setSesion(null)
        } else {
          setSesion(session)
          cargarDatosGenerales()
        }
      } else {
        setSesion(null)
        setCitas([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Auto-cancelación inteligente de citas pendientes que ya pasaron de fecha
  async function verificarCitasExpiradas(citasList: CitaConDetalles[]) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const expiradas = citasList.filter(c => 
      c.estado === 'pendiente' && new Date(c.fecha_inicio) < hoy
    )

    if (expiradas.length > 0) {
      for (const cita of expiradas) {
        await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', cita.id)
      }
      cargarCitasSilencioso()
    }
  }

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

    if (error) {
      alert('Error al cargar citas: ' + error.message)
    } else if (data) {
      const citasMapeadas = data as unknown as CitaConDetalles[]
      setCitas(citasMapeadas)
      await verificarCitasExpiradas(citasMapeadas)
    }
  }

  async function cargarCitasSilencioso() {
    const { data } = await supabase
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

    if (data) {
      setCitas(data as unknown as CitaConDetalles[])
    }
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      alert('Error al iniciar sesión: ' + error.message)
      return
    }

    const user = data.user
    if (user?.user_metadata?.role !== 'admin') {
      alert('Acceso denegado: Esta cuenta no tiene permisos de administrador.')
      await supabase.auth.signOut()
      setSesion(null)
    } else {
      setSesion(data.session)
      cargarDatosGenerales()
    }
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
    return <div className="text-center py-20 text-gray-500 font-medium">Verificando sesión y seguridad...</div>
  }

  if (!sesion) {
    return (
        <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">CitaPro Admin</h1>
            <p className="text-center text-gray-500 mb-6 text-sm">Inicia sesión con credenciales de administrador</p>
            
            <form onSubmit={manejarLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
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

  const hoyObj = new Date();
  hoyObj.setHours(0, 0, 0, 0);
  const mananaObj = new Date(hoyObj);
  mananaObj.setDate(mananaObj.getDate() + 1);
  const en7DiasObj = new Date(hoyObj);
  en7DiasObj.setDate(en7DiasObj.getDate() + 7);

  const citasFiltradas = citas.filter(cita => {
    if (filtroEstado !== 'todos' && cita.estado !== filtroEstado) return false;

    if (filtroFecha !== 'todas') {
      const fechaCita = new Date(cita.fecha_inicio);
      fechaCita.setHours(0, 0, 0, 0);

      if (filtroFecha === 'hoy' && fechaCita.getTime() !== hoyObj.getTime()) return false;
      if (filtroFecha === 'manana' && fechaCita.getTime() !== mananaObj.getTime()) return false;
      if (filtroFecha === 'proximos_7' && (fechaCita < hoyObj || fechaCita > en7DiasObj)) return false;
      if (filtroFecha === 'pasadas' && fechaCita >= hoyObj) return false;
    }

    return true;
  });

  const totalPaginas = Math.ceil(citasFiltradas.length / citasPorPagina) || 1;
  const indiceInicio = (paginaActual - 1) * citasPorPagina;
  const citasPaginadas = citasFiltradas.slice(indiceInicio, indiceInicio + citasPorPagina);

  const citasAEnviar = citasFiltradas.filter(c => c.estado === 'pendiente' && !!c.clientes?.telefono);

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
            <div className="text-center py-20 text-gray-500 font-medium">Cargando información...</div>
        ) : (
          <>
            {pestanaActiva === 'citas' && (
              <div>
                <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-md text-white flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <span>📢</span> Recordatorios de WhatsApp (Pendientes)
                    </h3>
                    <p className="text-emerald-100 text-sm mt-1">
                      Envía recordatorios masivos a las citas pendientes que coincidan con tus filtros.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (citasAEnviar.length === 0) {
                        alert('No hay citas pendientes con teléfono en los filtros actuales.');
                        return;
                      }

                      if (confirm(`Se abrirán ${citasAEnviar.length} pestañas de WhatsApp para enviar los recordatorios a citas pendientes. ¿Deseas continuar?`)) {
                        citasAEnviar.forEach((cita, index) => {
                          const telLimpio = cita.clientes.telefono.replace(/\D/g, '');
                          const horaCita = new Date(cita.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                          const mensaje = `¡Hola ${cita.clientes.nombre}! 👋 Te recordamos tu cita de *${cita.servicios?.nombre || 'servicio'}* programada para las *${horaCita}* en CitaPro. ¡Te esperamos!`;
                          
                          setTimeout(() => {
                            window.open(`https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
                          }, index * 400);
                        });
                      }
                    }}
                    className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-5 py-3 rounded-xl transition-all shadow-sm text-sm flex items-center gap-2 shrink-0"
                  >
                    🚀 Enviar a los {citasAEnviar.length} pendientes
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Filtrar por Estado</label>
                    <select 
                      value={filtroEstado} 
                      onChange={e => setFiltroEstado(e.target.value)} 
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="confirmada">Confirmadas</option>
                      <option value="completada">Completadas</option>
                      <option value="cancelada">Canceladas</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Filtrar por Fecha</label>
                    <select 
                      value={filtroFecha} 
                      onChange={e => setFiltroFecha(e.target.value)} 
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="todas">Cualquier fecha</option>
                      <option value="hoy">Hoy</option>
                      <option value="manana">Mañana</option>
                      <option value="proximos_7">Próximos 7 días</option>
                      <option value="pasadas">Citas Pasadas</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm text-gray-500 font-medium pb-2">Mostrando {citasFiltradas.length} resultados</p>
                  </div>
                </div>

                {citasPaginadas.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-500 font-medium">
                    No se encontraron citas con estos filtros.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {citasPaginadas.map(cita => {
                    const fechaCitaObj = new Date(cita.fecha_inicio);
                    fechaCitaObj.setHours(0, 0, 0, 0);
                    
                    const esCancelacionSistema = cita.estado === 'cancelada' && fechaCitaObj < hoyObj;
                    const fechaFormateada = new Date(cita.fecha_inicio).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    const estaBloqueada = cita.estado === 'cancelada' || cita.estado === 'completada'
                    
                    let colorEstado = 'bg-gray-100 text-gray-800 border-gray-200'
                    if (cita.estado === 'confirmada') colorEstado = 'bg-blue-50 text-blue-700 border-blue-200'
                    if (cita.estado === 'completada') colorEstado = 'bg-green-50 text-green-700 border-green-200'
                    if (cita.estado === 'cancelada') {
                      colorEstado = esCancelacionSistema ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'
                    }
                    if (cita.estado === 'pendiente') colorEstado = 'bg-amber-50 text-amber-700 border-amber-200'
                    
                    return (
                      <div key={cita.id} className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between ${estaBloqueada ? 'opacity-85 bg-gray-50' : ''}`}>
                        <div>
                          <div className={`px-5 py-3 border-b flex justify-between items-center text-xs font-bold uppercase tracking-wider ${colorEstado}`}>
                            <span>
                              {esCancelacionSistema ? '⚠️ Cancelada (Sistema)' : cita.estado} {estaBloqueada && '🔒'}
                            </span>
                            <span>{fechaFormateada}</span>
                          </div>
                          <div className="p-5 space-y-3">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{cita.clientes?.nombre || 'Cliente'}</h3>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <p className="text-gray-500 text-sm flex items-center gap-1">📞 {cita.clientes?.telefono || 'Sin teléfono'}</p>
                              {cita.clientes?.telefono && (
                                <button
                                  onClick={() => {
                                    const telLimpio = cita.clientes.telefono.replace(/\D/g, '');
                                    const mensajeAdmin = `¡Hola ${cita.clientes.nombre}! 👋 Te contactamos desde CitaPro respecto a tu cita de *${cita.servicios?.nombre || 'servicio'}* programada para el *${fechaFormateada}*.`;
                                    window.open(`https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeAdmin)}`, '_blank');
                                  }}
                                  className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                  💬 WhatsApp
                                </button>
                              )}
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2">
                              <p className="font-bold text-gray-800">{cita.servicios?.nombre || 'Servicio'}</p>
                              <label className="text-xs text-gray-500 font-medium block">Profesional:</label>
                              <select 
                                value={cita.trabajador_id || ''} 
                                onChange={(e) => cambiarTrabajadorCita(cita.id, e.target.value)} 
                                disabled={estaBloqueada} 
                                className="w-full text-xs border rounded-lg p-1.5 bg-white text-gray-900 font-medium"
                              >
                                <option value="">Disponible</option>
                                {trabajadores.map(trab => (<option key={trab.id} value={trab.id}>{trab.nombre} ({trab.especialidad})</option>))}
                              </select>
                              <p className="text-emerald-600 font-bold text-sm">Total: ${cita.precio_congelado?.toLocaleString('es-ES')}</p>
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

                {totalPaginas > 1 && (
                  <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl disabled:opacity-50 text-sm font-bold">← Anterior</button>
                    <span className="text-sm text-gray-600 font-bold">Página {paginaActual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl disabled:opacity-50 text-sm font-bold">Siguiente →</button>
                  </div>
                )}
              </div>
            )}

            {pestanaActiva === 'servicios' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Nuevo Servicio</h2>
                  <form onSubmit={registrarServicio} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <input type="text" placeholder="Nombre" value={nuevoServicioNombre} onChange={e => setNuevoServicioNombre(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900" required />
                    <input type="number" placeholder="Precio" value={nuevoServicioPrecio} onChange={e => setNuevoServicioPrecio(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900" required />
                    <input type="number" placeholder="Minutos" value={nuevoServicioDuracion} onChange={e => setNuevoServicioDuracion(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900" required />
                    <select value={nuevoServicioCategoria} onChange={e => setNuevoServicioCategoria(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900">
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
                                <input className="border rounded px-2 py-1 text-sm w-32 bg-white text-gray-900" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                                <input className="border rounded px-2 py-1 text-sm w-20 bg-white text-gray-900" type="number" value={editPrecio} onChange={e => setEditPrecio(e.target.value)} />
                                <input className="border rounded px-2 py-1 text-sm w-20 bg-white text-gray-900" type="number" value={editDuracion} onChange={e => setEditDuracion(e.target.value)} />
                                <button onClick={() => guardarEdicionServicio(serv.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Guardar</button>
                            </div>
                        ) : (
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800">{serv.nombre}</p>
                                <p className="text-sm text-gray-500">Duración: {serv.duracion} min | Precio: ${serv.precio?.toLocaleString('es-ES')}</p>
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
                    <input type="text" placeholder="Nombre" value={nuevoTrabajadorNombre} onChange={e => setNuevoTrabajadorNombre(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900" required />
                    <input type="text" placeholder="Especialidad" value={nuevoTrabajadorEspecialidad} onChange={e => setNuevoTrabajadorEspecialidad(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm bg-white text-gray-900" required />
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
                    <p className="text-sm text-gray-500 font-medium">Tasa de Éxito</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{tasaExito}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Ingresos Reales</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">${ingresosReales.toLocaleString('es-ES')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Desglose de Estados de Citas</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl text-blue-800 font-medium text-sm">
                        <span>Confirmadas</span>
                        <span className="font-bold">{citasConfirmadas}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl text-amber-800 font-medium text-sm">
                        <span>Pendientes</span>
                        <span className="font-bold">{citasPendientes}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl text-red-800 font-medium text-sm">
                        <span>Canceladas (Incluye sistema)</span>
                        <span className="font-bold">{citasCanceladas}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Proyección Financiera</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase">Ingresos Estimados (Completadas + Confirmadas)</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">${ingresosEstimados.toLocaleString('es-ES')}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-xs text-emerald-700 font-bold uppercase">Ingresos Reales Efectivos (Solo Completadas)</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-1">${ingresosReales.toLocaleString('es-ES')}</p>
                      </div>
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