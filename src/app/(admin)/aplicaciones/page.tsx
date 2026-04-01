'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Download, Search } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Insignia } from '@/components/ui/insignia'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Tabla, TablaCabecera, TablaCuerpo, TablaFila, TablaTh, TablaTd } from '@/components/ui/tabla'
import { aplicacionesApi, funcionesApi, usuariosApi } from '@/lib/api'
import type { Aplicacion, Funcion, Usuario } from '@/lib/tipos'
import { exportarExcel } from '@/lib/exportar-excel'

type FuncionApp = { codigo_funcion: string; funciones: { nombre_funcion: string; activo: boolean } }
type UsuarioApp = { codigo_usuario: string; usuarios: { nombre: string; activo: boolean } }

export default function PaginaAplicaciones() {
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([])
  const [funciones, setFunciones] = useState<Funcion[]>([])
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [appEditando, setAppEditando] = useState<Aplicacion | null>(null)
  const [form, setForm] = useState({ codigo_aplicacion: '', nombre: '', descripcion: '' })
  const [tabModal, setTabModal] = useState<'datos' | 'funciones' | 'usuarios'>('datos')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Funciones de la app
  const [funcionesApp, setFuncionesApp] = useState<FuncionApp[]>([])
  const [cargandoFunciones, setCargandoFunciones] = useState(false)
  const [funcionNueva, setFuncionNueva] = useState('')
  const [asignandoFuncion, setAsignandoFuncion] = useState(false)

  // Usuarios de la app
  const [usuariosApp, setUsuariosApp] = useState<UsuarioApp[]>([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false)
  const [usuarioNuevo, setUsuarioNuevo] = useState('')
  const [asignandoUsuario, setAsignandoUsuario] = useState(false)

  // Confirmar eliminación
  const [confirmacion, setConfirmacion] = useState<Aplicacion | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [a, f, u] = await Promise.all([
        aplicacionesApi.listar(),
        funcionesApi.listar(),
        usuariosApi.listar(),
      ])
      setAplicaciones(a)
      setFunciones(f)
      setTodosUsuarios(u)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cargarFuncionesApp = useCallback(async (codigo: string) => {
    setCargandoFunciones(true)
    try {
      setFuncionesApp(await aplicacionesApi.listarFunciones(codigo))
    } catch { setFuncionesApp([]) }
    finally { setCargandoFunciones(false) }
  }, [])

  const cargarUsuariosApp = useCallback(async (codigo: string) => {
    setCargandoUsuarios(true)
    try {
      setUsuariosApp(await aplicacionesApi.listarUsuarios(codigo))
    } catch { setUsuariosApp([]) }
    finally { setCargandoUsuarios(false) }
  }, [])

  // ── Modal ──────────────────────────────────────────────────────────────────
  const abrirNueva = () => {
    setAppEditando(null)
    setForm({ codigo_aplicacion: '', nombre: '', descripcion: '' })
    setError('')
    setTabModal('datos')
    setModalAbierto(true)
  }

  const abrirEditar = (a: Aplicacion) => {
    setAppEditando(a)
    setForm({ codigo_aplicacion: a.codigo_aplicacion, nombre: a.nombre, descripcion: a.descripcion || '' })
    setError('')
    setTabModal('datos')
    cargarFuncionesApp(a.codigo_aplicacion)
    cargarUsuariosApp(a.codigo_aplicacion)
    setModalAbierto(true)
  }

  const guardar = async () => {
    if (!form.codigo_aplicacion || !form.nombre) { setError('Código y nombre son obligatorios'); return }
    setGuardando(true)
    try {
      if (appEditando) {
        await aplicacionesApi.actualizar(appEditando.codigo_aplicacion, { nombre: form.nombre, descripcion: form.descripcion || undefined })
      } else {
        await aplicacionesApi.crear(form)
      }
      setModalAbierto(false)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const ejecutarEliminacion = async () => {
    if (!confirmacion) return
    setEliminando(true)
    try {
      await aplicacionesApi.desactivar(confirmacion.codigo_aplicacion)
      setConfirmacion(null)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
      setConfirmacion(null)
    } finally {
      setEliminando(false)
    }
  }

  // ── Funciones ──────────────────────────────────────────────────────────────
  const asignarFuncion = async () => {
    if (!funcionNueva || !appEditando) return
    setAsignandoFuncion(true)
    try {
      await aplicacionesApi.asignarFuncion(appEditando.codigo_aplicacion, funcionNueva)
      setFuncionNueva('')
      cargarFuncionesApp(appEditando.codigo_aplicacion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar función')
    } finally {
      setAsignandoFuncion(false)
    }
  }

  const quitarFuncion = async (codigoFuncion: string) => {
    if (!appEditando) return
    try {
      await aplicacionesApi.quitarFuncion(appEditando.codigo_aplicacion, codigoFuncion)
      cargarFuncionesApp(appEditando.codigo_aplicacion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al quitar función')
    }
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const asignarUsuario = async () => {
    if (!usuarioNuevo || !appEditando) return
    setAsignandoUsuario(true)
    try {
      await aplicacionesApi.asignarUsuario(appEditando.codigo_aplicacion, usuarioNuevo)
      setUsuarioNuevo('')
      cargarUsuariosApp(appEditando.codigo_aplicacion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar usuario')
    } finally {
      setAsignandoUsuario(false)
    }
  }

  const quitarUsuario = async (codigoUsuario: string) => {
    if (!appEditando) return
    try {
      await aplicacionesApi.quitarUsuario(appEditando.codigo_aplicacion, codigoUsuario)
      cargarUsuariosApp(appEditando.codigo_aplicacion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al quitar usuario')
    }
  }

  // ── Listas derivadas ──────────────────────────────────────────────────────
  const funcionesDisponibles = funciones.filter((f) =>
    f.activo && !funcionesApp.some((fa) => fa.codigo_funcion === f.codigo_funcion)
  )

  const usuariosDisponibles = todosUsuarios.filter((u) =>
    u.activo && !usuariosApp.some((ua) => ua.codigo_usuario === u.codigo_usuario)
  )

  const appsFiltradas = aplicaciones
    .filter((a) => a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || a.codigo_aplicacion.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const selectClass = 'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario'

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Aplicaciones</h2>
        <p className="text-sm text-texto-muted mt-1">Gestión de aplicaciones del sistema y sus relaciones</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icono={<Search size={15} />}
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Boton
            variante="contorno"
            tamano="sm"
            onClick={() => exportarExcel(appsFiltradas as Record<string, unknown>[], [
              { titulo: 'Código', campo: 'codigo_aplicacion' },
              { titulo: 'Nombre', campo: 'nombre' },
              { titulo: 'Descripción', campo: 'descripcion' },
              { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
            ], 'aplicaciones')}
            disabled={appsFiltradas.length === 0}
          >
            <Download size={15} />
            Excel
          </Boton>
          <Boton variante="primario" onClick={abrirNueva}><Plus size={16} />Nueva aplicación</Boton>
        </div>
      </div>

      <Tabla>
        <TablaCabecera>
          <tr>
            <TablaTh>Código</TablaTh>
            <TablaTh>Nombre</TablaTh>
            <TablaTh>Descripción</TablaTh>
            <TablaTh>Estado</TablaTh>
            <TablaTh className="text-right">Acciones</TablaTh>
          </tr>
        </TablaCabecera>
        <TablaCuerpo>
          {cargando ? (
            <TablaFila><TablaTd className="py-8 text-center text-texto-muted" colSpan={5 as never}>Cargando...</TablaTd></TablaFila>
          ) : appsFiltradas.length === 0 ? (
            <TablaFila><TablaTd className="py-8 text-center text-texto-muted" colSpan={5 as never}>No se encontraron aplicaciones</TablaTd></TablaFila>
          ) : appsFiltradas.map((a) => (
            <TablaFila key={a.codigo_aplicacion}>
              <TablaTd><code className="text-xs bg-fondo px-2 py-1 rounded font-mono">{a.codigo_aplicacion}</code></TablaTd>
              <TablaTd className="font-medium">{a.nombre}</TablaTd>
              <TablaTd className="text-texto-muted text-sm">{a.descripcion || '—'}</TablaTd>
              <TablaTd><Insignia variante={a.activo ? 'exito' : 'error'}>{a.activo ? 'Activo' : 'Inactivo'}</Insignia></TablaTd>
              <TablaTd>
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => abrirEditar(a)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmacion(a)} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </TablaTd>
            </TablaFila>
          ))}
        </TablaCuerpo>
      </Tabla>

      {/* Modal Aplicación */}
      <Modal abierto={modalAbierto} alCerrar={() => setModalAbierto(false)} titulo={appEditando ? `Editar: ${appEditando.codigo_aplicacion}` : 'Nueva aplicación'}>
        <div className="flex flex-col gap-4">
          {/* Tabs (solo en edición) */}
          {appEditando && (
            <div className="flex border-b border-borde -mx-1">
              {(['datos', 'funciones', 'usuarios'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTabModal(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                    tabModal === tab ? 'border-b-2 border-primario text-primario' : 'text-texto-muted hover:text-texto'
                  }`}
                >
                  {tab === 'datos' ? 'Datos' : tab === 'funciones' ? `Funciones (${funcionesApp.length})` : `Usuarios (${usuariosApp.length})`}
                </button>
              ))}
            </div>
          )}

          {/* Tab Datos */}
          {tabModal === 'datos' && (
            <>
              <Input etiqueta="Código *" value={form.codigo_aplicacion} onChange={(e) => setForm({ ...form, codigo_aplicacion: e.target.value.toUpperCase() })} disabled={!!appEditando} placeholder="SEGURIDAD" />
              <Input etiqueta="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Sistema de Seguridad" />
              <Input etiqueta="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción de la aplicación..." />
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-error">{error}</p></div>}
              <div className="flex gap-3 justify-end pt-2">
                <Boton variante="contorno" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
                <Boton variante="primario" onClick={guardar} cargando={guardando}>{appEditando ? 'Guardar' : 'Crear'}</Boton>
              </div>
            </>
          )}

          {/* Tab Funciones */}
          {tabModal === 'funciones' && appEditando && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <select value={funcionNueva} onChange={(e) => setFuncionNueva(e.target.value)} className={selectClass}>
                    <option value="">Seleccionar función...</option>
                    {funcionesDisponibles.map((f) => (
                      <option key={f.codigo_funcion} value={f.codigo_funcion}>{f.nombre} ({f.codigo_funcion})</option>
                    ))}
                  </select>
                </div>
                <Boton variante="primario" onClick={asignarFuncion} cargando={asignandoFuncion} disabled={!funcionNueva}>
                  <Plus size={14} />Asignar
                </Boton>
              </div>
              {cargandoFunciones ? (
                <div className="flex flex-col gap-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-surface rounded-lg border border-borde animate-pulse" />)}</div>
              ) : funcionesApp.length === 0 ? (
                <p className="text-sm text-texto-muted text-center py-4">No tiene funciones asignadas</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {funcionesApp.map((fa) => (
                    <div key={fa.codigo_funcion} className="flex items-center justify-between px-3 py-2 rounded-lg border border-borde bg-surface">
                      <div>
                        <span className="text-sm font-medium text-texto">{fa.funciones?.nombre_funcion || fa.codigo_funcion}</span>
                        <span className="ml-2 text-xs text-texto-muted">{fa.codigo_funcion}</span>
                      </div>
                      <button onClick={() => quitarFuncion(fa.codigo_funcion)} className="p-1 rounded hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Quitar"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-error">{error}</p></div>}
              <div className="flex justify-end pt-2">
                <Boton variante="contorno" onClick={() => setModalAbierto(false)}>Cerrar</Boton>
              </div>
            </div>
          )}

          {/* Tab Usuarios */}
          {tabModal === 'usuarios' && appEditando && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <select value={usuarioNuevo} onChange={(e) => setUsuarioNuevo(e.target.value)} className={selectClass}>
                    <option value="">Seleccionar usuario...</option>
                    {usuariosDisponibles.map((u) => (
                      <option key={u.codigo_usuario} value={u.codigo_usuario}>{u.nombre} ({u.codigo_usuario})</option>
                    ))}
                  </select>
                </div>
                <Boton variante="primario" onClick={asignarUsuario} cargando={asignandoUsuario} disabled={!usuarioNuevo}>
                  <Plus size={14} />Asignar
                </Boton>
              </div>
              {cargandoUsuarios ? (
                <div className="flex flex-col gap-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-surface rounded-lg border border-borde animate-pulse" />)}</div>
              ) : usuariosApp.length === 0 ? (
                <p className="text-sm text-texto-muted text-center py-4">No tiene usuarios asignados</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {usuariosApp.map((ua) => (
                    <div key={ua.codigo_usuario} className="flex items-center justify-between px-3 py-2 rounded-lg border border-borde bg-surface">
                      <div>
                        <span className="text-sm font-medium text-texto">{ua.usuarios?.nombre || ua.codigo_usuario}</span>
                        <span className="ml-2 text-xs text-texto-muted">{ua.codigo_usuario}</span>
                      </div>
                      <button onClick={() => quitarUsuario(ua.codigo_usuario)} className="p-1 rounded hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Quitar"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-error">{error}</p></div>}
              <div className="flex justify-end pt-2">
                <Boton variante="contorno" onClick={() => setModalAbierto(false)}>Cerrar</Boton>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Confirmar */}
      <ModalConfirmar
        abierto={!!confirmacion}
        alCerrar={() => setConfirmacion(null)}
        alConfirmar={ejecutarEliminacion}
        titulo="Desactivar aplicación"
        mensaje={`¿Estás seguro de desactivar la aplicación "${confirmacion?.nombre}"?`}
        textoConfirmar="Desactivar"
        cargando={eliminando}
      />
    </div>
  )
}
