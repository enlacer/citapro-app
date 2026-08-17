'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Categoria {
  id: string
  nombre: string
}

interface ProductoInventario {
  id: string
  nombre: string
  unidad_medida: string
  stock_actual: number
  categoria_id?: string
  categorias?: { nombre: string }
}

interface Trabajador {
  id: string
  nombre: string
  especialidad: string
  telefono?: string
  activo: boolean
}

export default function AdminPage() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Pestaña activa: 'servicios' | 'inventario' | 'trabajadores'
  const [tabActiva, setTabActiva] = useState<'servicios' | 'inventario' | 'trabajadores'>('servicios')

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [productos, setProductos] = useState<ProductoInventario[]>([])
  const [registrosInventario, setRegistrosInventario] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [cargando, setCargando] = useState(true)

  // Formulario Servicios
  const [nuevoServicio, setNuevoServicio] = useState({
    nombre: '',
    precio: 0,
    duracion: 30,
    categoria_id: ''
  })

  // Formulario Producto
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    unidad_medida: 'unidades',
    stock_actual: 0,
    categoria_id: ''
  })

  // Formulario Registro Diario
  const [nuevoRegistro, setNuevoRegistro] = useState({
    producto_id: '',
    tipo: 'apertura',
    cantidad: 0,
    observaciones: ''
  })

  // Formulario Trabajador
  const [nuevoTrabajador, setNuevoTrabajador] = useState({
    nombre: '',
    especialidad: '',
    telefono: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarAdminDatos()
      else setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) cargarAdminDatos()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function cargarAdminDatos() {
    setCargando(true)
    const { data: catData } = await supabase.from('categorias').select('*').eq('activo', true)
    const { data: servData } = await supabase.from('servicios').select('*, categorias(nombre)')
    const { data: prodData } = await supabase.from('inventario_productos').select('*, categorias(nombre)')
    const { data: regData } = await supabase.from('inventario_registros').select('*, inventario_productos(nombre)').order('created_at', { ascending: false }).limit(20)
    const { data: trabData } = await supabase.from('trabajadores').select('*').order('created_at', { ascending: false })

    if (catData) {
      setCategorias(catData)
      if (catData.length > 0) {
        setNuevoServicio(prev => ({ ...prev, categoria_id: catData[0].id }))
        setNuevoProducto(prev => ({ ...prev, categoria_id: catData[0].id }))
      }
    }
    if (servData) setServicios(servData)
    if (prodData) {
      setProductos(prodData)
      if (prodData.length > 0) setNuevoRegistro(prev => ({ ...prev, producto_id: prodData[0].id }))
    }
    if (regData) setRegistrosInventario(regData)
    if (trabData) setTrabajadores(trabData)
    setCargando(false)
  }

  async function guardarServicio(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoServicio.categoria_id) return alert('Selecciona una categoría')
    const { error } = await supabase.from('servicios').insert([{ ...nuevoServicio, activo: true }])
    if (error) alert('Error: ' + error.message)
    else {
      alert('¡Servicio guardado con éxito!')
      setNuevoServicio(prev => ({ ...prev, nombre: '', precio: 0, duracion: 30 }))
      cargarAdminDatos()
    }
  }

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('inventario_productos').insert([nuevoProducto])
    if (error) alert('Error: ' + error.message)
    else {
      alert('¡Producto creado exitosamente!')
      setNuevoProducto(prev => ({ ...prev, nombre: '', stock_actual: 0 }))
      cargarAdminDatos()
    }
  }

  async function guardarRegistroInventario(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoRegistro.producto_id) return alert('Selecciona un producto')
    const { error } = await supabase.from('inventario_registros').insert([nuevoRegistro])
    if (error) alert('Error: ' + error.message)
    else {
      alert(`¡Registro de ${nuevoRegistro.tipo.toUpperCase()} guardado!`)
      await supabase.from('inventario_productos').update({ stock_actual: nuevoRegistro.cantidad }).eq('id', nuevoRegistro.producto_id)
      setNuevoRegistro(prev => ({ ...prev, cantidad: 0, observaciones: '' }))
      cargarAdminDatos()
    }
  }

  async function guardarTrabajador(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('trabajadores').insert([{ ...nuevoTrabajador, activo: true }])
    if (error) alert('Error: ' + error.message)
    else {
      alert('¡Trabajador registrado exitosamente!')
      setNuevoTrabajador({ nombre: '', especialidad: '', telefono: '' })
      cargarAdminDatos()
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center">Iniciar Sesión - Admin</h1>
          {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (cargando) return <div className="p-10 text-center">Cargando Panel...</div>

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administración - CitaPro</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex border-b border-gray-200 gap-6">
          <button
            onClick={() => setTabActiva('servicios')}
            className={`pb-3 font-semibold text-lg transition-colors border-b-2 ${
              tabActiva === 'servicios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Catálogo & Servicios
          </button>
          <button
            onClick={() => setTabActiva('inventario')}
            className={`pb-3 font-semibold text-lg transition-colors border-b-2 ${
              tabActiva === 'inventario' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Inventario Diario
          </button>
          <button
            onClick={() => setTabActiva('trabajadores')}
            className={`pb-3 font-semibold text-lg transition-colors border-b-2 ${
              tabActiva === 'trabajadores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Equipo de Trabajo
          </button>
        </div>

        {/* PESTAÑA SERVICIOS */}
        {tabActiva === 'servicios' && (
          <div className="space-y-8">
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
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
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
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg">
                    Guardar Servicio
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Catálogo Actual</h2>
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
                      <td className="p-3 text-blue-600 font-medium">{serv.categorias?.nombre || 'Sin Categoría'}</td>
                      <td className="p-3">${serv.precio}</td>
                      <td className="p-3">{serv.duracion} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA INVENTARIO */}
        {tabActiva === 'inventario' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">1. Crear Nuevo Insumo / Producto</h2>
              <form onSubmit={guardarProducto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Insumo</label>
                  <input
                    type="text"
                    required
                    value={nuevoProducto.nombre}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                  <select
                    value={nuevoProducto.unidad_medida}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, unidad_medida: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="unidades">Unidades</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="gramos">Gramos (g)</option>
                    <option value="cajas">Cajas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    required
                    value={nuevoProducto.stock_actual}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, stock_actual: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Asociada</label>
                  <select
                    value={nuevoProducto.categoria_id}
                    onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">
                    Registrar Insumo
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">2. Registro Diario de Apertura / Cierre</h2>
              <form onSubmit={guardarRegistroInventario} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insumo</label>
                  <select
                    value={nuevoRegistro.producto_id}
                    onChange={e => setNuevoRegistro({ ...nuevoRegistro, producto_id: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual} {p.unidad_medida})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Registro</label>
                  <select
                    value={nuevoRegistro.tipo}
                    onChange={e => setNuevoRegistro({ ...nuevoRegistro, tipo: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="apertura">Apertura (Inicio)</option>
                    <option value="cierre">Cierre (Fin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Contada</label>
                  <input
                    type="number"
                    required
                    value={nuevoRegistro.cantidad}
                    onChange={e => setNuevoRegistro({ ...nuevoRegistro, cantidad: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <input
                    type="text"
                    value={nuevoRegistro.observaciones}
                    onChange={e => setNuevoRegistro({ ...nuevoRegistro, observaciones: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg">
                    Guardar Conteo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PESTAÑA TRABAJADORES */}
        {tabActiva === 'trabajadores' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Registrar Colaborador / Trabajador</h2>
              <form onSubmit={guardarTrabajador} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={nuevoTrabajador.nombre}
                    onChange={e => setNuevoTrabajador({ ...nuevoTrabajador, nombre: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="Ej. Sofía Martínez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad / Área</label>
                  <input
                    type="text"
                    required
                    value={nuevoTrabajador.especialidad}
                    onChange={e => setNuevoTrabajador({ ...nuevoTrabajador, especialidad: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="Ej. Spa de Uñas, Barbería..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto (Opcional)</label>
                  <input
                    type="text"
                    value={nuevoTrabajador.telefono}
                    onChange={e => setNuevoTrabajador({ ...nuevoTrabajador, telefono: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="Ej. +57 300 123 4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg">
                    Agregar Trabajador
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Equipo Registrado</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Especialidad</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {trabajadores.map(trab => (
                    <tr key={trab.id} className="border-b">
                      <td className="p-3 font-medium">{trab.nombre}</td>
                      <td className="p-3 text-purple-700 font-medium">{trab.especialidad}</td>
                      <td className="p-3 text-gray-600">{trab.telefono || '-'}</td>
                      <td className="p-3">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">
                          ACTIVO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}