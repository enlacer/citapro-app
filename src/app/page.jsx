// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { obtenerDisponibilidad } from '@/utils/disponibilidad';

export default function Home() {
  const [categorias, setCategorias] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  // Campos del formulario
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [trabajadorIdSeleccionado, setTrabajadorIdSeleccionado] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [reservaExitosa, setReservaExitosa] = useState(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  async function cargarDatosIniciales() {
    const { data: catData } = await supabase.from('categorias').select('*').eq('activo', true);
    if (catData) setCategorias(catData);

    const { data: trabData } = await supabase.from('trabajadores').select('*').eq('activo', true);
    if (trabData) setTrabajadores(trabData);
  }

  async function seleccionarCategoria(cat) {
    setCategoriaSeleccionada(cat);
    setServicioSeleccionado(null);
    setReservaExitosa(null);
    const { data } = await supabase.from('servicios').select('*').eq('categoria_id', cat.id).eq('activo', true);
    if (data) setServicios(data);
  }

  useEffect(() => {
    if (servicioSeleccionado && fechaSeleccionada) {
      buscarHoras();
    } else {
      setHorasDisponibles([]);
    }
  }, [trabajadorIdSeleccionado, fechaSeleccionada, servicioSeleccionado]);

  async function buscarHoras() {
    setCargandoHoras(true);
    setHoraSeleccionada('');
    const horas = await obtenerDisponibilidad(
      trabajadorIdSeleccionado, 
      fechaSeleccionada, 
      servicioSeleccionado.duracion_minutos
    );
    setHorasDisponibles(horas);
    setCargandoHoras(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!horaSeleccionada) {
      setMensaje({ tipo: 'error', texto: 'Por favor selecciona una hora disponible.' });
      return;
    }

    try {
      let clienteId = null;
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', telefonoCliente)
        .single();

      if (clienteExistente) {
        clienteId = clienteExistente.id;
        await supabase.from('clientes').update({ nombre: nombreCliente }).eq('id', clienteId);
      } else {
        const { data: nuevoCliente, error: errCliente } = await supabase
          .from('clientes')
          .insert([{ nombre: nombreCliente, telefono: telefonoCliente, negocio_id: servicioSeleccionado.negocio_id || null }])
          .select('id')
          .single();

        if (errCliente) throw new Error('Error al registrar cliente: ' + errCliente.message);
        clienteId = nuevoCliente.id;
      }

      const fechaInicio = new Date(`${fechaSeleccionada}T${horaSeleccionada}:00`).toISOString();
      const fechaFin = new Date(new Date(fechaInicio).getTime() + servicioSeleccionado.duracion_minutos * 60000).toISOString();

      const { error: errCita } = await supabase.from('citas').insert([
        {
          negocio_id: servicioSeleccionado.negocio_id || null,
          cliente_id: clienteId,
          servicio_id: servicioSeleccionado.id,
          trabajador_id: trabajadorIdSeleccionado === '' ? null : trabajadorIdSeleccionado,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          fecha_hora: fechaInicio,
          estado: 'pendiente',
          precio_congelado: servicioSeleccionado.precio
        }
      ]);

      if (errCita) throw new Error('Error al crear cita: ' + errCita.message);

      setReservaExitosa({
        servicio: servicioSeleccionado.nombre,
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        nombre: nombreCliente
      });

      setNombreCliente('');
      setTelefonoCliente('');
      setHoraSeleccionada('');
      setFechaSeleccionada('');
      setServicioSeleccionado(null);
      setCategoriaSeleccionada(null);
      setMensaje(null);

    } catch (error) {
      console.error(error);
      setMensaje({ tipo: 'error', texto: error.message });
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Reserva tu espacio de belleza y cuidado</h1>
        
        {reservaExitosa ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">✓</div>
            <h2 className="text-2xl font-bold text-gray-900">¡Cita Reservada con Éxito!</h2>
            <p className="text-gray-600">
              Gracias <span className="font-semibold text-gray-800">{reservaExitosa.nombre}</span>, tu solicitud para <span className="font-semibold text-gray-800">{reservaExitosa.servicio}</span> el día <span className="font-semibold text-gray-800">{reservaExitosa.fecha}</span> a las <span className="font-semibold text-gray-800">{reservaExitosa.hora}</span> se ha registrado correctamente.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
              ⚠️ Queda pendiente de confirmación. El establecimiento verificará tu horario pronto.
            </div>
            <button 
              onClick={() => setReservaExitosa(null)}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition w-full"
            >
              Hacer otra reserva
            </button>
          </div>
        ) : !categoriaSeleccionada ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4 mt-8">Selecciona una categoría</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categorias.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => seleccionarCategoria(cat)}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition"
                >
                  <h3 className="text-lg font-bold text-gray-800">{cat.nombre}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cat.descripcion || 'Explora nuestros servicios'}</p>
                </div>
              ))}
            </div>
          </div>
        ) : !servicioSeleccionado ? (
          <div>
            <button 
              onClick={() => setCategoriaSeleccionada(null)}
              className="text-blue-600 hover:underline mb-6 inline-block font-medium"
            >
              ← Volver a categorías
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{categoriaSeleccionada.nombre}</h2>
            <div className="grid grid-cols-1 gap-4">
              {servicios.map(serv => (
                <div 
                  key={serv.id} 
                  onClick={() => setServicioSeleccionado(serv)}
                  className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{serv.nombre}</h3>
                    <p className="text-sm text-gray-500">{serv.duracion_minutos} minutos — ${serv.precio}</p>
                  </div>
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Reservar</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mt-6">
            <button 
              onClick={() => setServicioSeleccionado(null)}
              className="text-blue-600 hover:underline mb-4 inline-block font-medium"
            >
              ← Volver a servicios
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Completar Reserva: {servicioSeleccionado.nombre}</h2>
            
            {mensaje && (
              <div className={`p-4 mb-6 rounded-lg text-sm ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {mensaje.texto}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
                <input 
                  type="text" 
                  required 
                  value={nombreCliente} 
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
                <input 
                  type="text" 
                  required 
                  value={telefonoCliente} 
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. 3001234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Profesional</label>
                <select 
                  value={trabajadorIdSeleccionado} 
                  onChange={(e) => setTrabajadorIdSeleccionado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">✨ Cualquier profesional disponible (Asignar después)</option>
                  {trabajadores.map(trab => (
                    <option key={trab.id} value={trab.id}>
                      {trab.nombre} ({trab.especialidad || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input 
                  type="date" 
                  required 
                  value={fechaSeleccionada} 
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              {fechaSeleccionada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horas Disponibles</label>
                  {cargandoHoras ? (
                    <p className="text-sm text-gray-500">Calculando disponibilidad...</p>
                  ) : horasDisponibles.length === 0 ? (
                    <p className="text-sm text-red-600 font-medium">No hay disponibilidad para esta fecha y selección.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                      {horasDisponibles.map(hora => (
                        <button
                          key={hora}
                          type="button"
                          onClick={() => setHoraSeleccionada(hora)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${
                            horaSeleccionada === hora 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setServicioSeleccionado(null)}
                  className="w-1/2 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!horaSeleccionada}
                  className={`w-1/2 py-3 rounded-lg font-medium text-white transition ${
                    !horaSeleccionada ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Confirmar Cita
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}