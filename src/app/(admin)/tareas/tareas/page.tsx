'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Download } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Insignia } from '@/components/ui/insignia'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Tabla, TablaCabecera, TablaCuerpo, TablaFila, TablaTh, TablaTd } from '@/components/ui/tabla'
import { tareasApi, tareasDatosBasicosApi, usuariosApi, entidadesApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Tarea, TipoTarea, EstadoTarea, CategoriaTarea, Conversacion, Usuario, Area } from '@/lib/tipos'
import { exportarExcel } from '@/lib/exportar-excel'

const selectClass = 'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario disabled:opacity-50'

const PRIORIDAD_VARIANTE: Record<string, 'error' | 'advertencia' | 'primario' | 'exito'> = {
  urgente: 'error',
  alto: 'advertencia',
  medio: 'primario',
  bajo: 'exito',
}

const PRIORIDADES = [
  { valor: 'urgente', etiqueta: 'Urgente' },
  { valor: 'alto', etiqueta: 'Alto' },
  { valor: 'medio', etiqueta: 'Medio' },
  { valor: 'bajo', etiqueta: 'Bajo' },
]

const TIPOS_MIME = [
  { valor: 'application/pdf', etiqueta: 'PDF' },
  { valor: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', etiqueta: 'Word (DOCX)' },
  { valor: 'message/rfc822', etiqueta: 'Correo (EML)' },
]

const formInicial = {
  codigo_categoria_tarea: '',
  codigo_tipo_tarea: '',
  nombre_tarea: '',
  descripcion_tarea: '',
  prioridad: 'medio' as 'urgente' | 'alto' | 'medio' | 'bajo',
  codigo_estado_tarea: '',
  fecha_esperada: '',
  id_conversacion: '' as string | number,
  comentarios: '',
  esfuerzo_horas: '' as string | number,
  costo_tarea: '' as string | number,
  codigo_usuario_destinatario: '',
  codigo_ubicacion_area_asignada: '',
  codigo_usuario_asignado: '',
}

const adjuntoInicial = { nombre: '', url: '', tipo_mime: '', tamano: '' as string | number }

export default function PaginaTareas() {
  const { usuario: usuarioActual } = useAuth()
  const grupoActivo = usuarioActual?.grupo_activo ?? ''
  const entidadActiva = usuarioActual?.entidad_activa ?? ''

  // ── Estado principal ──────────────────────────────────────────────────────
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Tarea | null>(null)
  const [tabModal, setTabModal] = useState<'datos' | 'asignacion' | 'adjunto'>('datos')
  const [form, setForm] = useState({ ...formInicial })
  const [formAdjunto, setFormAdjunto] = useState({ ...adjuntoInicial })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // ── Datos auxiliares ──────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<CategoriaTarea[]>([])
  const [tipos, setTipos] = useState<TipoTarea[]>([])
  const [estados, setEstados] = useState<EstadoTarea[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const [confirmarEliminar, setConfirmarEliminar] = useState<number | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorCarga('')
    try {
      const [tars, tps, cats, usrs] = await Promise.all([
        tareasApi.listarTareas(),
        tareasDatosBasicosApi.listarTiposTar(),
        tareasDatosBasicosApi.listarCategorias(),
        usuariosApi.listar(),
      ])
      setTareas(tars)
      setTipos(tps)
      setCategorias(cats)
      setUsuarios(usrs)

      // Cargar areas de la entidad activa
      if (entidadActiva) {
        try {
          const ars = await entidadesApi.listarAreas(entidadActiva)
          setAreas(ars)
        } catch {
          setAreas([])
        }
      }

      // Cargar conversaciones
      try {
        const cnvs = await tareasApi.listarConversaciones()
        setConversaciones(cnvs)
      } catch {
        setConversaciones([])
      }
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : 'Error al cargar tareas')
    } finally {
      setCargando(false)
    }
  }, [entidadActiva])

  useEffect(() => { cargar() }, [cargar])

  // ── Cargar estados cuando cambia tipo en el form ─────────────────────────
  useEffect(() => {
    if (!form.codigo_tipo_tarea) {
      setEstados([])
      return
    }
    tareasDatosBasicosApi.listarEstadosTar(form.codigo_tipo_tarea)
      .then(setEstados)
      .catch(() => setEstados([]))
  }, [form.codigo_tipo_tarea])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const tareasFiltradas = tareas.filter((t) => {
    const coincideBusqueda =
      !busqueda ||
      (t.nombre_tarea || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.descripcion_tarea || '').toLowerCase().includes(busqueda.toLowerCase())

    const coincideCategoria = !filtroCategoria || t.codigo_categoria_tarea === filtroCategoria
    const coincideTipo = !filtroTipo || t.codigo_tipo_tarea === filtroTipo
    const coincidePrioridad = !filtroPrioridad || t.prioridad === filtroPrioridad

    return coincideBusqueda && coincideCategoria && coincideTipo && coincidePrioridad
  })

  // ── Helpers de nombres ────────────────────────────────────────────────────
  const nombreTipo = (codigo: string) =>
    tipos.find((t) => t.codigo_tipo_tarea === codigo)?.nombre_tipo_tarea || codigo

  const nombreCategoria = (codigo: string) =>
    categorias.find((c) => c.codigo_categoria_tarea === codigo)?.nombre_categoria_tarea || codigo

  const nombreUsuario = (codigo?: string) => {
    if (!codigo) return ''
    const u = usuarios.find((u) => u.codigo_usuario === codigo)
    return u?.nombre || codigo
  }

  const nombreArea = (codigo?: string) => {
    if (!codigo) return ''
    const a = areas.find((a) => a.codigo_area === codigo)
    return a?.nombre || codigo
  }

  // ── Tipos filtrados por categoría del form ───────────────────────────────
  const tiposDeCategoriaForm = tipos.filter(
    (t) => !form.codigo_categoria_tarea || t.codigo_categoria_tarea === form.codigo_categoria_tarea
  )

  // ── Abrir modal ───────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...formInicial })
    setFormAdjunto({ ...adjuntoInicial })
    setError('')
    setGuardando(false)
    setTabModal('datos')
    setEstados([])
    setModalAbierto(true)
  }

  const abrirEditar = (t: Tarea) => {
    setEditando(t)
    setForm({
      codigo_categoria_tarea: t.codigo_categoria_tarea,
      codigo_tipo_tarea: t.codigo_tipo_tarea,
      nombre_tarea: t.nombre_tarea,
      descripcion_tarea: t.descripcion_tarea || '',
      prioridad: t.prioridad,
      codigo_estado_tarea: t.codigo_estado_tarea,
      fecha_esperada: t.fecha_esperada ? t.fecha_esperada.substring(0, 10) : '',
      id_conversacion: t.id_conversacion ?? '',
      comentarios: t.comentarios || '',
      esfuerzo_horas: t.esfuerzo_horas ?? '',
      costo_tarea: t.costo_tarea ?? '',
      codigo_usuario_destinatario: t.codigo_usuario_destinatario || '',
      codigo_ubicacion_area_asignada: t.codigo_ubicacion_area_asignada || '',
      codigo_usuario_asignado: t.codigo_usuario_asignado || '',
    })
    setFormAdjunto(
      t.adjunto
        ? { nombre: t.adjunto.nombre, url: t.adjunto.url, tipo_mime: t.adjunto.tipo_mime, tamano: t.adjunto.tamano }
        : { ...adjuntoInicial }
    )
    setError('')
    setGuardando(false)
    setTabModal('datos')
    setModalAbierto(true)
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async (cerrar: boolean) => {
    setError('')
    if (!form.codigo_categoria_tarea) {
      setError('La categoría es obligatoria')
      return
    }
    if (!form.nombre_tarea.trim()) {
      setError('El nombre de la tarea es obligatorio')
      return
    }
    if (!form.codigo_tipo_tarea) {
      setError('El tipo de tarea es obligatorio')
      return
    }
    if (!form.codigo_estado_tarea) {
      setError('El estado es obligatorio')
      return
    }

    setGuardando(true)
    try {
      const adjunto = formAdjunto.url.trim()
        ? {
            nombre: formAdjunto.nombre.trim() || 'Sin nombre',
            url: formAdjunto.url.trim(),
            tipo_mime: formAdjunto.tipo_mime || 'application/pdf',
            tamano: Number(formAdjunto.tamano) || 0,
          }
        : undefined

      const datos: Partial<Tarea> = {
        codigo_categoria_tarea: form.codigo_categoria_tarea,
        codigo_tipo_tarea: form.codigo_tipo_tarea,
        nombre_tarea: form.nombre_tarea.trim(),
        descripcion_tarea: form.descripcion_tarea.trim() || undefined,
        prioridad: form.prioridad,
        codigo_estado_tarea: form.codigo_estado_tarea,
        fecha_esperada: form.fecha_esperada || undefined,
        id_conversacion: form.id_conversacion ? Number(form.id_conversacion) : undefined,
        comentarios: form.comentarios.trim() || undefined,
        esfuerzo_horas: form.esfuerzo_horas !== '' ? Number(form.esfuerzo_horas) : undefined,
        costo_tarea: form.costo_tarea !== '' ? Number(form.costo_tarea) : undefined,
        codigo_usuario_destinatario: form.codigo_usuario_destinatario || undefined,
        codigo_ubicacion_area_asignada: form.codigo_ubicacion_area_asignada || undefined,
        codigo_usuario_asignado: form.codigo_usuario_asignado || undefined,
        adjunto,
      }

      if (editando) {
        await tareasApi.actualizarTarea(editando.id_tarea, datos)
      } else {
        const nuevo = await tareasApi.crearTarea(datos)
        if (!cerrar && nuevo) {
          setEditando(nuevo)
        }
      }
      if (cerrar) {
        setModalAbierto(false)
      }
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const ejecutarEliminar = async () => {
    if (confirmarEliminar === null) return
    setEliminando(true)
    try {
      await tareasApi.eliminarTarea(confirmarEliminar)
      setConfirmarEliminar(null)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
      setConfirmarEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  // ── Tabs del modal ────────────────────────────────────────────────────────
  const tabs: { key: typeof tabModal; label: string }[] = [
    { key: 'datos', label: 'Datos' },
    { key: 'asignacion', label: 'Asignación' },
    { key: 'adjunto', label: 'Adjunto' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-texto">Tareas</h2>
          <p className="text-sm text-texto-muted mt-1">Gestión de tareas, compromisos y tickets</p>
        </div>
        <Boton variante="primario" onClick={abrirNuevo}>
          <Plus size={16} />
          Nueva tarea
        </Boton>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icono={<Search size={15} />}
          />
        </div>
        <select
          className={selectClass + ' max-w-[200px]'}
          value={filtroCategoria}
          onChange={(e) => { setFiltroCategoria(e.target.value); setFiltroTipo('') }}
        >
          <option value="">Todas las categorías</option>
          {categorias.filter((c) => c.activo).map((c) => (
            <option key={c.codigo_categoria_tarea} value={c.codigo_categoria_tarea}>
              {c.nombre_categoria_tarea}
            </option>
          ))}
        </select>
        <select
          className={selectClass + ' max-w-[200px]'}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {tipos
            .filter((t) => !filtroCategoria || t.codigo_categoria_tarea === filtroCategoria)
            .map((t) => (
              <option key={t.codigo_tipo_tarea} value={t.codigo_tipo_tarea}>
                {t.nombre_tipo_tarea}
              </option>
            ))}
        </select>
        <select
          className={selectClass + ' max-w-[160px]'}
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
        >
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
          ))}
        </select>
        <Boton
          variante="contorno"
          tamano="sm"
          onClick={() => exportarExcel(tareasFiltradas as unknown as Record<string, unknown>[], [
            { titulo: 'ID', campo: 'id_tarea' },
            { titulo: 'Nombre', campo: 'nombre_tarea' },
            { titulo: 'Categoría', campo: 'codigo_categoria_tarea', formato: (v) => nombreCategoria(v as string) },
            { titulo: 'Tipo', campo: 'codigo_tipo_tarea', formato: (v) => nombreTipo(v as string) },
            { titulo: 'Prioridad', campo: 'prioridad', formato: (v) => {
              const p = PRIORIDADES.find((p) => p.valor === v)
              return p?.etiqueta || (v as string)
            }},
            { titulo: 'Destinatario', campo: 'codigo_usuario_destinatario', formato: (v) => nombreUsuario(v as string) },
            { titulo: 'Área', campo: 'codigo_ubicacion_area_asignada', formato: (v) => nombreArea(v as string) },
            { titulo: 'Asignado a', campo: 'codigo_usuario_asignado', formato: (v) => nombreUsuario(v as string) },
            { titulo: 'Estado', campo: 'codigo_estado_tarea' },
            { titulo: 'Fecha esperada', campo: 'fecha_esperada', formato: (v) => v ? new Date(v as string).toLocaleDateString('es-CL') : '' },
            { titulo: 'Fecha creación', campo: 'fecha_creacion', formato: (v) => v ? new Date(v as string).toLocaleString('es-CL') : '' },
          ], `tareas_${grupoActivo || 'todos'}`)}
          disabled={tareasFiltradas.length === 0}
        >
          <Download size={15} />
          Excel
        </Boton>
      </div>

      {errorCarga && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-error">{errorCarga}</p>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface rounded-lg border border-borde animate-pulse" />
          ))}
        </div>
      ) : (
        <Tabla>
          <TablaCabecera>
            <tr>
              <TablaTh>ID</TablaTh>
              <TablaTh>Nombre</TablaTh>
              <TablaTh>Categoría</TablaTh>
              <TablaTh>Tipo</TablaTh>
              <TablaTh>Prioridad</TablaTh>
              <TablaTh>Asignado a</TablaTh>
              <TablaTh>Estado</TablaTh>
              <TablaTh>Fecha esperada</TablaTh>
              <TablaTh className="text-right">Acciones</TablaTh>
            </tr>
          </TablaCabecera>
          <TablaCuerpo>
            {tareasFiltradas.length === 0 ? (
              <TablaFila>
                <TablaTd className="text-center text-texto-muted py-8" colSpan={9 as never}>
                  No se encontraron tareas
                </TablaTd>
              </TablaFila>
            ) : (
              tareasFiltradas.map((t) => (
                <TablaFila key={t.id_tarea}>
                  <TablaTd className="text-texto-muted text-xs">{t.id_tarea}</TablaTd>
                  <TablaTd>
                    <span className="font-medium">{t.nombre_tarea}</span>
                  </TablaTd>
                  <TablaTd className="text-texto-muted">{nombreCategoria(t.codigo_categoria_tarea)}</TablaTd>
                  <TablaTd className="text-texto-muted">{nombreTipo(t.codigo_tipo_tarea)}</TablaTd>
                  <TablaTd>
                    <Insignia variante={PRIORIDAD_VARIANTE[t.prioridad] || 'neutro'}>
                      {PRIORIDADES.find((p) => p.valor === t.prioridad)?.etiqueta || t.prioridad}
                    </Insignia>
                  </TablaTd>
                  <TablaTd className="text-texto-muted">
                    {nombreUsuario(t.codigo_usuario_asignado) || <span className="text-texto-light">--</span>}
                  </TablaTd>
                  <TablaTd className="text-texto-muted">{t.codigo_estado_tarea}</TablaTd>
                  <TablaTd className="text-texto-muted">
                    {t.fecha_esperada ? new Date(t.fecha_esperada).toLocaleDateString('es-CL') : <span className="text-texto-light">--</span>}
                  </TablaTd>
                  <TablaTd className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(t)}
                        className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(t.id_tarea)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </TablaTd>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>
      )}

      {/* Modal crear/editar */}
      <Modal
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        titulo={editando ? 'Editar tarea' : 'Nueva tarea'}
        className="max-w-2xl"
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-borde">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTabModal(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tabModal === t.key
                  ? 'border-primario text-primario'
                  : 'border-transparent text-texto-muted hover:text-texto'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Tab Datos */}
        {tabModal === 'datos' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-texto mb-1">Categoría *</label>
              <select
                className={selectClass}
                value={form.codigo_categoria_tarea}
                onChange={(e) => setForm({
                  ...form,
                  codigo_categoria_tarea: e.target.value,
                  codigo_tipo_tarea: '',
                  codigo_estado_tarea: '',
                })}
                disabled={!!editando}
              >
                <option value="">Seleccionar categoría...</option>
                {categorias.filter((c) => c.activo).map((c) => (
                  <option key={c.codigo_categoria_tarea} value={c.codigo_categoria_tarea}>
                    {c.nombre_categoria_tarea}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Tipo de tarea *</label>
              <select
                className={selectClass}
                value={form.codigo_tipo_tarea}
                onChange={(e) => setForm({ ...form, codigo_tipo_tarea: e.target.value, codigo_estado_tarea: '' })}
                disabled={!form.codigo_categoria_tarea}
              >
                <option value="">Seleccionar tipo...</option>
                {tiposDeCategoriaForm.filter((t) => t.activo).map((t) => (
                  <option key={t.codigo_tipo_tarea} value={t.codigo_tipo_tarea}>
                    {t.nombre_tipo_tarea}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Nombre de la tarea *</label>
              <Input
                value={form.nombre_tarea}
                onChange={(e) => setForm({ ...form, nombre_tarea: e.target.value })}
                placeholder="Nombre de la tarea"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Descripción</label>
              <textarea
                className={selectClass + ' min-h-[80px] resize-y'}
                value={form.descripcion_tarea}
                onChange={(e) => setForm({ ...form, descripcion_tarea: e.target.value })}
                placeholder="Descripción detallada..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Prioridad *</label>
                <select
                  className={selectClass}
                  value={form.prioridad}
                  onChange={(e) => setForm({ ...form, prioridad: e.target.value as typeof form.prioridad })}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Estado *</label>
                <select
                  className={selectClass}
                  value={form.codigo_estado_tarea}
                  onChange={(e) => setForm({ ...form, codigo_estado_tarea: e.target.value })}
                  disabled={!form.codigo_tipo_tarea}
                >
                  <option value="">Seleccionar estado...</option>
                  {estados.filter((e) => e.activo).map((e) => (
                    <option key={e.codigo_estado_tarea} value={e.codigo_estado_tarea}>
                      {e.nombre_estado_tarea}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Fecha esperada</label>
                <input
                  type="date"
                  className={selectClass}
                  value={form.fecha_esperada}
                  onChange={(e) => setForm({ ...form, fecha_esperada: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Conversación</label>
                <select
                  className={selectClass}
                  value={form.id_conversacion}
                  onChange={(e) => setForm({ ...form, id_conversacion: e.target.value })}
                >
                  <option value="">Sin conversación</option>
                  {conversaciones.map((cnv) => (
                    <option key={cnv.id_conversacion} value={cnv.id_conversacion}>
                      ({cnv.id_conversacion}) {cnv.asunto}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Comentarios</label>
              <textarea
                className={selectClass + ' min-h-[60px] resize-y'}
                value={form.comentarios}
                onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                placeholder="Comentarios adicionales..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Esfuerzo (horas)</label>
                <input
                  type="number"
                  className={selectClass}
                  value={form.esfuerzo_horas}
                  onChange={(e) => setForm({ ...form, esfuerzo_horas: e.target.value })}
                  min={0}
                  step={0.5}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Costo</label>
                <input
                  type="number"
                  className={selectClass}
                  value={form.costo_tarea}
                  onChange={(e) => setForm({ ...form, costo_tarea: e.target.value })}
                  min={0}
                  step={1}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab Asignación */}
        {tabModal === 'asignacion' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-texto mb-1">Destinatario</label>
              <select
                className={selectClass}
                value={form.codigo_usuario_destinatario}
                onChange={(e) => setForm({ ...form, codigo_usuario_destinatario: e.target.value })}
              >
                <option value="">Sin destinatario</option>
                {usuarios.filter((u) => u.activo).map((u) => (
                  <option key={u.codigo_usuario} value={u.codigo_usuario}>
                    {u.nombre} ({u.codigo_usuario})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Área asignada</label>
              <select
                className={selectClass}
                value={form.codigo_ubicacion_area_asignada}
                onChange={(e) => setForm({ ...form, codigo_ubicacion_area_asignada: e.target.value })}
              >
                <option value="">Sin área</option>
                {areas.filter((a) => a.activo).map((a) => (
                  <option key={a.codigo_area} value={a.codigo_area}>
                    {'  '.repeat(a.nivel || 0)}{a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Usuario asignado</label>
              <select
                className={selectClass}
                value={form.codigo_usuario_asignado}
                onChange={(e) => setForm({ ...form, codigo_usuario_asignado: e.target.value })}
              >
                <option value="">Sin asignar</option>
                {usuarios.filter((u) => u.activo).map((u) => (
                  <option key={u.codigo_usuario} value={u.codigo_usuario}>
                    {u.nombre} ({u.codigo_usuario})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tab Adjunto */}
        {tabModal === 'adjunto' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-texto-muted">
              Adjunte un enlace de Google Drive u otra URL a la tarea.
            </p>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">Nombre del archivo</label>
              <Input
                value={formAdjunto.nombre}
                onChange={(e) => setFormAdjunto({ ...formAdjunto, nombre: e.target.value })}
                placeholder="Ej: Informe final.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-texto mb-1">URL (Google Drive)</label>
              <Input
                value={formAdjunto.url}
                onChange={(e) => setFormAdjunto({ ...formAdjunto, url: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Tipo de archivo</label>
                <select
                  className={selectClass}
                  value={formAdjunto.tipo_mime}
                  onChange={(e) => setFormAdjunto({ ...formAdjunto, tipo_mime: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_MIME.map((t) => (
                    <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto mb-1">Tamaño (bytes)</label>
                <input
                  type="number"
                  className={selectClass}
                  value={formAdjunto.tamano}
                  onChange={(e) => setFormAdjunto({ ...formAdjunto, tamano: e.target.value })}
                  min={0}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Botones del modal */}
        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-borde">
          <Boton variante="secundario" onClick={() => setModalAbierto(false)}>
            Salir
          </Boton>
          <Boton variante="primario" onClick={() => guardar(false)} cargando={guardando}>
            Guardar
          </Boton>
        </div>
      </Modal>

      {/* Modal confirmar eliminar */}
      <ModalConfirmar
        abierto={confirmarEliminar !== null}
        alCerrar={() => setConfirmarEliminar(null)}
        alConfirmar={ejecutarEliminar}
        titulo="Eliminar tarea"
        mensaje={`¿Está seguro de que desea eliminar la tarea #${confirmarEliminar}? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        variante="peligro"
        cargando={eliminando}
      />
    </div>
  )
}
