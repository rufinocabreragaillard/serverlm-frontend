'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Insignia } from '@/components/ui/insignia'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Tabla, TablaCabecera, TablaCuerpo, TablaFila, TablaTh, TablaTd } from '@/components/ui/tabla'
import { tareasDatosBasicosApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { exportarExcel } from '@/lib/exportar-excel'
import type {
  TipoConversacion,
  TipoTarea,
  EstadoConversacion,
  EstadoTarea,
  EstadoCanonicoConversacion,
  EstadoCanonicoTarea,
} from '@/lib/tipos'

type TabId =
  | 'tipos-conversacion'
  | 'estados-conversacion'
  | 'tipos-tarea'
  | 'estados-tarea'
  | 'canonicos-conversacion'
  | 'canonicos-tarea'

export default function DatosBasicosTareasPage() {
  const { grupoActivo } = useAuth()
  const [tabActiva, setTabActiva] = useState<TabId>('tipos-conversacion')

  // ── Tipos Conversacion ─────────────────────────────────────────────────────
  const [tiposCnv, setTiposCnv] = useState<TipoConversacion[]>([])
  const [cargandoTiposCnv, setCargandoTiposCnv] = useState(true)
  const [modalTipoCnv, setModalTipoCnv] = useState(false)
  const [tipoCnvEditando, setTipoCnvEditando] = useState<TipoConversacion | null>(null)
  const [formTipoCnv, setFormTipoCnv] = useState({ codigo_tipo_conversacion: '', nombre: '', descripcion: '' })
  const [guardandoTipoCnv, setGuardandoTipoCnv] = useState(false)
  const [errorTipoCnv, setErrorTipoCnv] = useState('')

  // ── Estados Conversacion ───────────────────────────────────────────────────
  const [estadosCnv, setEstadosCnv] = useState<EstadoConversacion[]>([])
  const [cargandoEstadosCnv, setCargandoEstadosCnv] = useState(true)
  const [modalEstadoCnv, setModalEstadoCnv] = useState(false)
  const [estadoCnvEditando, setEstadoCnvEditando] = useState<EstadoConversacion | null>(null)
  const [formEstadoCnv, setFormEstadoCnv] = useState({ codigo_tipo_conversacion: '', codigo_estado_conversacion: '', nombre: '', codigo_estado_canonico: '', orden: 0 })
  const [guardandoEstadoCnv, setGuardandoEstadoCnv] = useState(false)
  const [errorEstadoCnv, setErrorEstadoCnv] = useState('')
  const [filtroTipoCnv, setFiltroTipoCnv] = useState('')

  // ── Tipos Tarea ───────────────────────────────────────────────────────
  const [tiposTar, setTiposTar] = useState<TipoTarea[]>([])
  const [cargandoTiposTar, setCargandoTiposTar] = useState(true)
  const [modalTipoTar, setModalTipoTar] = useState(false)
  const [tipoTarEditando, setTipoTarEditando] = useState<TipoTarea | null>(null)
  const [formTipoTar, setFormTipoTar] = useState({ codigo_tipo_tarea: '', nombre: '', descripcion: '' })
  const [guardandoTipoTar, setGuardandoTipoTar] = useState(false)
  const [errorTipoTar, setErrorTipoTar] = useState('')

  // ── Estados Tarea ─────────────────────────────────────────────────────
  const [estadosTar, setEstadosTar] = useState<EstadoTarea[]>([])
  const [cargandoEstadosTar, setCargandoEstadosTar] = useState(true)
  const [modalEstadoTar, setModalEstadoTar] = useState(false)
  const [estadoTarEditando, setEstadoTarEditando] = useState<EstadoTarea | null>(null)
  const [formEstadoTar, setFormEstadoTar] = useState({ codigo_tipo_tarea: '', codigo_estado_tarea: '', nombre: '', codigo_estado_canonico: '', orden: 0 })
  const [guardandoEstadoTar, setGuardandoEstadoTar] = useState(false)
  const [errorEstadoTar, setErrorEstadoTar] = useState('')
  const [filtroTipoTar, setFiltroTipoTar] = useState('')

  // ── Canonicos Conversacion ─────────────────────────────────────────────────
  const [canonicosCnv, setCanonicosCnv] = useState<EstadoCanonicoConversacion[]>([])
  const [cargandoCanonicosCnv, setCargandoCanonicosCnv] = useState(true)
  const [modalCanCnv, setModalCanCnv] = useState(false)
  const [canCnvEditando, setCanCnvEditando] = useState<EstadoCanonicoConversacion | null>(null)
  const [formCanCnv, setFormCanCnv] = useState({ codigo_estado_canonico: '', nombre: '' })
  const [guardandoCanCnv, setGuardandoCanCnv] = useState(false)
  const [errorCanCnv, setErrorCanCnv] = useState('')

  // ── Canonicos Tarea ───────────────────────────────────────────────────
  const [canonicosTar, setCanonicosTar] = useState<EstadoCanonicoTarea[]>([])
  const [cargandoCanonicosTar, setCargandoCanonicosTar] = useState(true)
  const [modalCanTar, setModalCanTar] = useState(false)
  const [canTarEditando, setCanTarEditando] = useState<EstadoCanonicoTarea | null>(null)
  const [formCanTar, setFormCanTar] = useState({ codigo_estado_canonico: '', nombre: '' })
  const [guardandoCanTar, setGuardandoCanTar] = useState(false)
  const [errorCanTar, setErrorCanTar] = useState('')

  // ── Eliminacion ────────────────────────────────────────────────────────────
  const [itemAEliminar, setItemAEliminar] = useState<{ tipo: string; item: Record<string, unknown> } | null>(null)
  const [eliminandoItem, setEliminandoItem] = useState(false)

  // ── Carga ──────────────────────────────────────────────────────────────────
  const cargarTiposCnv = useCallback(async () => {
    setCargandoTiposCnv(true)
    try { setTiposCnv(await tareasDatosBasicosApi.listarTiposCnv()) } finally { setCargandoTiposCnv(false) }
  }, [])

  const cargarEstadosCnv = useCallback(async () => {
    setCargandoEstadosCnv(true)
    try { setEstadosCnv(await tareasDatosBasicosApi.listarEstadosCnv(filtroTipoCnv || undefined)) } finally { setCargandoEstadosCnv(false) }
  }, [filtroTipoCnv])

  const cargarTiposTar = useCallback(async () => {
    setCargandoTiposTar(true)
    try { setTiposTar(await tareasDatosBasicosApi.listarTiposTar()) } finally { setCargandoTiposTar(false) }
  }, [])

  const cargarEstadosTar = useCallback(async () => {
    setCargandoEstadosTar(true)
    try { setEstadosTar(await tareasDatosBasicosApi.listarEstadosTar(filtroTipoTar || undefined)) } finally { setCargandoEstadosTar(false) }
  }, [filtroTipoTar])

  const cargarCanonicosCnv = useCallback(async () => {
    setCargandoCanonicosCnv(true)
    try { setCanonicosCnv(await tareasDatosBasicosApi.listarCanonicosCnv()) } finally { setCargandoCanonicosCnv(false) }
  }, [])

  const cargarCanonicosTar = useCallback(async () => {
    setCargandoCanonicosTar(true)
    try { setCanonicosTar(await tareasDatosBasicosApi.listarCanonicosTar()) } finally { setCargandoCanonicosTar(false) }
  }, [])

  useEffect(() => { cargarTiposCnv() }, [cargarTiposCnv, grupoActivo])
  useEffect(() => { cargarEstadosCnv() }, [cargarEstadosCnv, grupoActivo])
  useEffect(() => { cargarTiposTar() }, [cargarTiposTar, grupoActivo])
  useEffect(() => { cargarEstadosTar() }, [cargarEstadosTar, grupoActivo])
  useEffect(() => { cargarCanonicosCnv() }, [cargarCanonicosCnv])
  useEffect(() => { cargarCanonicosTar() }, [cargarCanonicosTar])

  // ── CRUD Tipos Conversacion ────────────────────────────────────────────────
  const abrirNuevoTipoCnv = () => {
    setTipoCnvEditando(null)
    setFormTipoCnv({ codigo_tipo_conversacion: '', nombre: '', descripcion: '' })
    setErrorTipoCnv('')
    setModalTipoCnv(true)
  }

  const abrirEditarTipoCnv = (t: TipoConversacion) => {
    setTipoCnvEditando(t)
    setFormTipoCnv({ codigo_tipo_conversacion: t.codigo_tipo_conversacion, nombre: t.nombre, descripcion: t.descripcion || '' })
    setErrorTipoCnv('')
    setModalTipoCnv(true)
  }

  const guardarTipoCnv = async () => {
    if (!formTipoCnv.codigo_tipo_conversacion || !formTipoCnv.nombre) {
      setErrorTipoCnv('El codigo y el nombre son obligatorios')
      return
    }
    setGuardandoTipoCnv(true)
    setErrorTipoCnv('')
    try {
      if (tipoCnvEditando) {
        await tareasDatosBasicosApi.actualizarTipoCnv(tipoCnvEditando.codigo_tipo_conversacion, {
          nombre: formTipoCnv.nombre,
          descripcion: formTipoCnv.descripcion || undefined,
        })
      } else {
        await tareasDatosBasicosApi.crearTipoCnv({
          codigo_tipo_conversacion: formTipoCnv.codigo_tipo_conversacion.toUpperCase(),
          nombre: formTipoCnv.nombre,
          descripcion: formTipoCnv.descripcion || undefined,
        })
      }
      setModalTipoCnv(false)
      cargarTiposCnv()
    } catch (e) {
      setErrorTipoCnv(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardandoTipoCnv(false)
    }
  }

  const toggleActivoTipoCnv = async (t: TipoConversacion) => {
    try {
      await tareasDatosBasicosApi.actualizarTipoCnv(t.codigo_tipo_conversacion, { activo: !t.activo })
      cargarTiposCnv()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  // ── CRUD Estados Conversacion ──────────────────────────────────────────────
  const abrirNuevoEstadoCnv = () => {
    setEstadoCnvEditando(null)
    setFormEstadoCnv({ codigo_tipo_conversacion: filtroTipoCnv, codigo_estado_conversacion: '', nombre: '', codigo_estado_canonico: '', orden: 0 })
    setErrorEstadoCnv('')
    setModalEstadoCnv(true)
  }

  const abrirEditarEstadoCnv = (e: EstadoConversacion) => {
    setEstadoCnvEditando(e)
    setFormEstadoCnv({
      codigo_tipo_conversacion: e.codigo_tipo_conversacion,
      codigo_estado_conversacion: e.codigo_estado_conversacion,
      nombre: e.nombre,
      codigo_estado_canonico: e.codigo_estado_canonico,
      orden: e.orden,
    })
    setErrorEstadoCnv('')
    setModalEstadoCnv(true)
  }

  const guardarEstadoCnv = async () => {
    if (!formEstadoCnv.codigo_tipo_conversacion || !formEstadoCnv.codigo_estado_conversacion || !formEstadoCnv.nombre || !formEstadoCnv.codigo_estado_canonico) {
      setErrorEstadoCnv('Tipo, codigo, nombre y estado canonico son obligatorios')
      return
    }
    setGuardandoEstadoCnv(true)
    setErrorEstadoCnv('')
    try {
      if (estadoCnvEditando) {
        await tareasDatosBasicosApi.actualizarEstadoCnv(
          estadoCnvEditando.codigo_tipo_conversacion,
          estadoCnvEditando.codigo_estado_conversacion,
          {
            nombre: formEstadoCnv.nombre,
            codigo_estado_canonico: formEstadoCnv.codigo_estado_canonico,
            orden: formEstadoCnv.orden,
          }
        )
      } else {
        await tareasDatosBasicosApi.crearEstadoCnv({
          codigo_tipo_conversacion: formEstadoCnv.codigo_tipo_conversacion,
          codigo_estado_conversacion: formEstadoCnv.codigo_estado_conversacion.toUpperCase(),
          nombre: formEstadoCnv.nombre,
          codigo_estado_canonico: formEstadoCnv.codigo_estado_canonico,
          orden: formEstadoCnv.orden,
        })
      }
      setModalEstadoCnv(false)
      cargarEstadosCnv()
    } catch (e) {
      setErrorEstadoCnv(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardandoEstadoCnv(false)
    }
  }

  const toggleActivoEstadoCnv = async (e: EstadoConversacion) => {
    try {
      await tareasDatosBasicosApi.actualizarEstadoCnv(e.codigo_tipo_conversacion, e.codigo_estado_conversacion, { activo: !e.activo })
      cargarEstadosCnv()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado')
    }
  }

  // ── CRUD Tipos Tarea ──────────────────────────────────────────────────
  const abrirNuevoTipoTar = () => {
    setTipoTarEditando(null)
    setFormTipoTar({ codigo_tipo_tarea: '', nombre: '', descripcion: '' })
    setErrorTipoTar('')
    setModalTipoTar(true)
  }

  const abrirEditarTipoTar = (t: TipoTarea) => {
    setTipoTarEditando(t)
    setFormTipoTar({ codigo_tipo_tarea: t.codigo_tipo_tarea, nombre: t.nombre, descripcion: t.descripcion || '' })
    setErrorTipoTar('')
    setModalTipoTar(true)
  }

  const guardarTipoTar = async () => {
    if (!formTipoTar.codigo_tipo_tarea || !formTipoTar.nombre) {
      setErrorTipoTar('El codigo y el nombre son obligatorios')
      return
    }
    setGuardandoTipoTar(true)
    setErrorTipoTar('')
    try {
      if (tipoTarEditando) {
        await tareasDatosBasicosApi.actualizarTipoTar(tipoTarEditando.codigo_tipo_tarea, {
          nombre: formTipoTar.nombre,
          descripcion: formTipoTar.descripcion || undefined,
        })
      } else {
        await tareasDatosBasicosApi.crearTipoTar({
          codigo_tipo_tarea: formTipoTar.codigo_tipo_tarea.toUpperCase(),
          nombre: formTipoTar.nombre,
          descripcion: formTipoTar.descripcion || undefined,
        })
      }
      setModalTipoTar(false)
      cargarTiposTar()
    } catch (e) {
      setErrorTipoTar(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardandoTipoTar(false)
    }
  }

  const toggleActivoTipoTar = async (t: TipoTarea) => {
    try {
      await tareasDatosBasicosApi.actualizarTipoTar(t.codigo_tipo_tarea, { activo: !t.activo })
      cargarTiposTar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  // ── CRUD Estados Tarea ────────────────────────────────────────────────
  const abrirNuevoEstadoTar = () => {
    setEstadoTarEditando(null)
    setFormEstadoTar({ codigo_tipo_tarea: filtroTipoTar, codigo_estado_tarea: '', nombre: '', codigo_estado_canonico: '', orden: 0 })
    setErrorEstadoTar('')
    setModalEstadoTar(true)
  }

  const abrirEditarEstadoTar = (e: EstadoTarea) => {
    setEstadoTarEditando(e)
    setFormEstadoTar({
      codigo_tipo_tarea: e.codigo_tipo_tarea,
      codigo_estado_tarea: e.codigo_estado_tarea,
      nombre: e.nombre,
      codigo_estado_canonico: e.codigo_estado_canonico,
      orden: e.orden,
    })
    setErrorEstadoTar('')
    setModalEstadoTar(true)
  }

  const guardarEstadoTar = async () => {
    if (!formEstadoTar.codigo_tipo_tarea || !formEstadoTar.codigo_estado_tarea || !formEstadoTar.nombre || !formEstadoTar.codigo_estado_canonico) {
      setErrorEstadoTar('Tipo, codigo, nombre y estado canonico son obligatorios')
      return
    }
    setGuardandoEstadoTar(true)
    setErrorEstadoTar('')
    try {
      if (estadoTarEditando) {
        await tareasDatosBasicosApi.actualizarEstadoTar(
          estadoTarEditando.codigo_tipo_tarea,
          estadoTarEditando.codigo_estado_tarea,
          {
            nombre: formEstadoTar.nombre,
            codigo_estado_canonico: formEstadoTar.codigo_estado_canonico,
            orden: formEstadoTar.orden,
          }
        )
      } else {
        await tareasDatosBasicosApi.crearEstadoTar({
          codigo_tipo_tarea: formEstadoTar.codigo_tipo_tarea,
          codigo_estado_tarea: formEstadoTar.codigo_estado_tarea.toUpperCase(),
          nombre: formEstadoTar.nombre,
          codigo_estado_canonico: formEstadoTar.codigo_estado_canonico,
          orden: formEstadoTar.orden,
        })
      }
      setModalEstadoTar(false)
      cargarEstadosTar()
    } catch (e) {
      setErrorEstadoTar(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardandoEstadoTar(false)
    }
  }

  const toggleActivoEstadoTar = async (e: EstadoTarea) => {
    try {
      await tareasDatosBasicosApi.actualizarEstadoTar(e.codigo_tipo_tarea, e.codigo_estado_tarea, { activo: !e.activo })
      cargarEstadosTar()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado')
    }
  }

  // ── CRUD Canonicos Conversacion ────────────────────────────────────────────
  const abrirNuevoCanCnv = () => {
    setCanCnvEditando(null)
    setFormCanCnv({ codigo_estado_canonico: '', nombre: '' })
    setErrorCanCnv('')
    setModalCanCnv(true)
  }

  const abrirEditarCanCnv = (c: EstadoCanonicoConversacion) => {
    setCanCnvEditando(c)
    setFormCanCnv({ codigo_estado_canonico: c.codigo_estado_canonico, nombre: c.nombre })
    setErrorCanCnv('')
    setModalCanCnv(true)
  }

  const guardarCanCnv = async () => {
    if (!formCanCnv.codigo_estado_canonico || !formCanCnv.nombre) {
      setErrorCanCnv('El codigo y el nombre son obligatorios')
      return
    }
    setGuardandoCanCnv(true)
    setErrorCanCnv('')
    try {
      if (canCnvEditando) {
        await tareasDatosBasicosApi.actualizarCanonicosCnv(canCnvEditando.codigo_estado_canonico, { nombre: formCanCnv.nombre })
      } else {
        await tareasDatosBasicosApi.crearCanonicosCnv({
          codigo_estado_canonico: formCanCnv.codigo_estado_canonico.toUpperCase(),
          nombre: formCanCnv.nombre,
        })
      }
      setModalCanCnv(false)
      cargarCanonicosCnv()
    } catch (e) {
      setErrorCanCnv(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardandoCanCnv(false)
    }
  }

  const toggleActivoCanCnv = async (c: EstadoCanonicoConversacion) => {
    try {
      await tareasDatosBasicosApi.actualizarCanonicosCnv(c.codigo_estado_canonico, { activo: !c.activo })
      cargarCanonicosCnv()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  // ── CRUD Canonicos Tarea ──────────────────────────────────────────────
  const abrirNuevoCanTar = () => {
    setCanTarEditando(null)
    setFormCanTar({ codigo_estado_canonico: '', nombre: '' })
    setErrorCanTar('')
    setModalCanTar(true)
  }

  const abrirEditarCanTar = (c: EstadoCanonicoTarea) => {
    setCanTarEditando(c)
    setFormCanTar({ codigo_estado_canonico: c.codigo_estado_canonico, nombre: c.nombre })
    setErrorCanTar('')
    setModalCanTar(true)
  }

  const guardarCanTar = async () => {
    if (!formCanTar.codigo_estado_canonico || !formCanTar.nombre) {
      setErrorCanTar('El codigo y el nombre son obligatorios')
      return
    }
    setGuardandoCanTar(true)
    setErrorCanTar('')
    try {
      if (canTarEditando) {
        await tareasDatosBasicosApi.actualizarCanonicosTar(canTarEditando.codigo_estado_canonico, { nombre: formCanTar.nombre })
      } else {
        await tareasDatosBasicosApi.crearCanonicosTar({
          codigo_estado_canonico: formCanTar.codigo_estado_canonico.toUpperCase(),
          nombre: formCanTar.nombre,
        })
      }
      setModalCanTar(false)
      cargarCanonicosTar()
    } catch (e) {
      setErrorCanTar(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardandoCanTar(false)
    }
  }

  const toggleActivoCanTar = async (c: EstadoCanonicoTarea) => {
    try {
      await tareasDatosBasicosApi.actualizarCanonicosTar(c.codigo_estado_canonico, { activo: !c.activo })
      cargarCanonicosTar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  // ── Eliminacion centralizada ───────────────────────────────────────────────
  const ejecutarEliminacion = async () => {
    if (!itemAEliminar) return
    setEliminandoItem(true)
    try {
      switch (itemAEliminar.tipo) {
        case 'tipo-cnv':
          await tareasDatosBasicosApi.eliminarTipoCnv(itemAEliminar.item.codigo_tipo_conversacion as string)
          cargarTiposCnv()
          break
        case 'estado-cnv':
          await tareasDatosBasicosApi.eliminarEstadoCnv(
            itemAEliminar.item.codigo_tipo_conversacion as string,
            itemAEliminar.item.codigo_estado_conversacion as string
          )
          cargarEstadosCnv()
          break
        case 'tipo-cmp':
          await tareasDatosBasicosApi.eliminarTipoTar(itemAEliminar.item.codigo_tipo_tarea as string)
          cargarTiposTar()
          break
        case 'estado-cmp':
          await tareasDatosBasicosApi.eliminarEstadoTar(
            itemAEliminar.item.codigo_tipo_tarea as string,
            itemAEliminar.item.codigo_estado_tarea as string
          )
          cargarEstadosTar()
          break
        case 'can-cnv':
          await tareasDatosBasicosApi.eliminarCanonicosCnv(itemAEliminar.item.codigo_estado_canonico as string)
          cargarCanonicosCnv()
          break
        case 'can-cmp':
          await tareasDatosBasicosApi.eliminarCanonicosTar(itemAEliminar.item.codigo_estado_canonico as string)
          cargarCanonicosTar()
          break
      }
      setItemAEliminar(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar')
      setItemAEliminar(null)
    } finally {
      setEliminandoItem(false)
    }
  }

  // ── Skeleton ───────────────────────────────────────────────────────────────
  const skeleton = (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-surface rounded-lg border border-borde animate-pulse" />
      ))}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-texto">Datos Basicos - Tareas</h2>
        <p className="text-sm text-texto-muted mt-1">Configuracion de tipos, estados y estados canonicos para conversaciones y tareas</p>
      </div>

      {/* Pestanas */}
      <div className="flex border-b border-borde gap-1 flex-wrap">
        {([
          { id: 'tipos-conversacion' as TabId, label: 'Tipos Conversacion' },
          { id: 'estados-conversacion' as TabId, label: 'Estados Conversacion' },
          { id: 'tipos-tarea' as TabId, label: 'Tipos Tarea' },
          { id: 'estados-tarea' as TabId, label: 'Estados Tarea' },
          { id: 'canonicos-conversacion' as TabId, label: 'Canonicos Conversacion' },
          { id: 'canonicos-tarea' as TabId, label: 'Canonicos Tarea' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              tabActiva === tab.id
                ? 'border-b-2 border-primario text-primario font-semibold'
                : 'text-texto-muted hover:text-texto'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Tipos Conversacion ── */}
      {tabActiva === 'tipos-conversacion' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-texto-muted">
              Define los tipos de conversacion disponibles en el modulo de tareas
            </p>
            <div className="flex gap-2">
              <Boton
                variante="contorno"
                tamano="sm"
                onClick={() => exportarExcel(tiposCnv as unknown as Record<string, unknown>[], [
                  { titulo: 'Codigo', campo: 'codigo_tipo_conversacion' },
                  { titulo: 'Nombre', campo: 'nombre' },
                  { titulo: 'Descripcion', campo: 'descripcion' },
                  { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
                ], 'tipos_conversacion')}
                disabled={tiposCnv.length === 0}
              >
                <Download size={15} />
                Excel
              </Boton>
              <Boton variante="primario" onClick={abrirNuevoTipoCnv}>
                <Plus size={16} />
                Nuevo tipo
              </Boton>
            </div>
          </div>

          {cargandoTiposCnv ? skeleton : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  <TablaTh>Codigo</TablaTh>
                  <TablaTh>Nombre</TablaTh>
                  <TablaTh>Descripcion</TablaTh>
                  <TablaTh>Estado</TablaTh>
                  <TablaTh className="text-right">Acciones</TablaTh>
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {tiposCnv.length === 0 ? (
                  <TablaFila>
                    <TablaTd className="text-center text-texto-muted py-8" colSpan={5 as never}>
                      No hay tipos de conversacion registrados
                    </TablaTd>
                  </TablaFila>
                ) : (
                  tiposCnv.map((t) => (
                    <TablaFila key={t.codigo_tipo_conversacion}>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {t.codigo_tipo_conversacion}
                        </code>
                      </TablaTd>
                      <TablaTd className="font-medium">{t.nombre}</TablaTd>
                      <TablaTd className="text-texto-muted text-sm">
                        {t.descripcion || <span className="text-texto-light">-</span>}
                      </TablaTd>
                      <TablaTd>
                        <button onClick={() => toggleActivoTipoCnv(t)} title="Cambiar estado">
                          <Insignia variante={t.activo ? 'exito' : 'error'}>
                            {t.activo ? 'Activo' : 'Inactivo'}
                          </Insignia>
                        </button>
                      </TablaTd>
                      <TablaTd>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditarTipoCnv(t)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setItemAEliminar({ tipo: 'tipo-cnv', item: t as unknown as Record<string, unknown> })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TablaTd>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          )}
        </>
      )}

      {/* ── Tab: Estados Conversacion ── */}
      {tabActiva === 'estados-conversacion' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-texto-muted">Filtrar por tipo:</p>
              <select
                value={filtroTipoCnv}
                onChange={(e) => setFiltroTipoCnv(e.target.value)}
                className="rounded-lg border border-borde bg-surface px-3 py-1.5 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario"
              >
                <option value="">Todos</option>
                {tiposCnv.filter((t) => t.activo).map((t) => (
                  <option key={t.codigo_tipo_conversacion} value={t.codigo_tipo_conversacion}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Boton
                variante="contorno"
                tamano="sm"
                onClick={() => exportarExcel(estadosCnv as unknown as Record<string, unknown>[], [
                  { titulo: 'Tipo', campo: 'codigo_tipo_conversacion' },
                  { titulo: 'Codigo', campo: 'codigo_estado_conversacion' },
                  { titulo: 'Nombre', campo: 'nombre' },
                  { titulo: 'Canonico', campo: 'codigo_estado_canonico' },
                  { titulo: 'Orden', campo: 'orden' },
                  { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
                ], `estados_conversacion${filtroTipoCnv ? '_' + filtroTipoCnv : ''}`)}
                disabled={estadosCnv.length === 0}
              >
                <Download size={15} />
                Excel
              </Boton>
              <Boton variante="primario" onClick={abrirNuevoEstadoCnv}>
                <Plus size={16} />
                Nuevo estado
              </Boton>
            </div>
          </div>

          {cargandoEstadosCnv ? skeleton : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  <TablaTh>Tipo</TablaTh>
                  <TablaTh>Codigo</TablaTh>
                  <TablaTh>Nombre</TablaTh>
                  <TablaTh>Canonico</TablaTh>
                  <TablaTh>Orden</TablaTh>
                  <TablaTh>Estado</TablaTh>
                  <TablaTh className="text-right">Acciones</TablaTh>
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {estadosCnv.length === 0 ? (
                  <TablaFila>
                    <TablaTd className="text-center text-texto-muted py-8" colSpan={7 as never}>
                      No hay estados de conversacion registrados
                    </TablaTd>
                  </TablaFila>
                ) : (
                  estadosCnv.map((e) => (
                    <TablaFila key={`${e.codigo_tipo_conversacion}/${e.codigo_estado_conversacion}`}>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {e.codigo_tipo_conversacion}
                        </code>
                      </TablaTd>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {e.codigo_estado_conversacion}
                        </code>
                      </TablaTd>
                      <TablaTd className="font-medium">{e.nombre}</TablaTd>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {e.codigo_estado_canonico}
                        </code>
                      </TablaTd>
                      <TablaTd>{e.orden}</TablaTd>
                      <TablaTd>
                        <button onClick={() => toggleActivoEstadoCnv(e)} title="Cambiar estado">
                          <Insignia variante={e.activo ? 'exito' : 'error'}>
                            {e.activo ? 'Activo' : 'Inactivo'}
                          </Insignia>
                        </button>
                      </TablaTd>
                      <TablaTd>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditarEstadoCnv(e)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setItemAEliminar({ tipo: 'estado-cnv', item: e as unknown as Record<string, unknown> })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TablaTd>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          )}
        </>
      )}

      {/* ── Tab: Tipos Tarea ── */}
      {tabActiva === 'tipos-tarea' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-texto-muted">
              Define los tipos de tarea disponibles en el modulo
            </p>
            <div className="flex gap-2">
              <Boton
                variante="contorno"
                tamano="sm"
                onClick={() => exportarExcel(tiposTar as unknown as Record<string, unknown>[], [
                  { titulo: 'Codigo', campo: 'codigo_tipo_tarea' },
                  { titulo: 'Nombre', campo: 'nombre' },
                  { titulo: 'Descripcion', campo: 'descripcion' },
                  { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
                ], 'tipos_tarea')}
                disabled={tiposTar.length === 0}
              >
                <Download size={15} />
                Excel
              </Boton>
              <Boton variante="primario" onClick={abrirNuevoTipoTar}>
                <Plus size={16} />
                Nuevo tipo
              </Boton>
            </div>
          </div>

          {cargandoTiposTar ? skeleton : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  <TablaTh>Codigo</TablaTh>
                  <TablaTh>Nombre</TablaTh>
                  <TablaTh>Descripcion</TablaTh>
                  <TablaTh>Estado</TablaTh>
                  <TablaTh className="text-right">Acciones</TablaTh>
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {tiposTar.length === 0 ? (
                  <TablaFila>
                    <TablaTd className="text-center text-texto-muted py-8" colSpan={5 as never}>
                      No hay tipos de tarea registrados
                    </TablaTd>
                  </TablaFila>
                ) : (
                  tiposTar.map((t) => (
                    <TablaFila key={t.codigo_tipo_tarea}>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {t.codigo_tipo_tarea}
                        </code>
                      </TablaTd>
                      <TablaTd className="font-medium">{t.nombre}</TablaTd>
                      <TablaTd className="text-texto-muted text-sm">
                        {t.descripcion || <span className="text-texto-light">-</span>}
                      </TablaTd>
                      <TablaTd>
                        <button onClick={() => toggleActivoTipoTar(t)} title="Cambiar estado">
                          <Insignia variante={t.activo ? 'exito' : 'error'}>
                            {t.activo ? 'Activo' : 'Inactivo'}
                          </Insignia>
                        </button>
                      </TablaTd>
                      <TablaTd>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditarTipoTar(t)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setItemAEliminar({ tipo: 'tipo-cmp', item: t as unknown as Record<string, unknown> })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TablaTd>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          )}
        </>
      )}

      {/* ── Tab: Estados Tarea ── */}
      {tabActiva === 'estados-tarea' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-texto-muted">Filtrar por tipo:</p>
              <select
                value={filtroTipoTar}
                onChange={(e) => setFiltroTipoTar(e.target.value)}
                className="rounded-lg border border-borde bg-surface px-3 py-1.5 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario"
              >
                <option value="">Todos</option>
                {tiposTar.filter((t) => t.activo).map((t) => (
                  <option key={t.codigo_tipo_tarea} value={t.codigo_tipo_tarea}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Boton
                variante="contorno"
                tamano="sm"
                onClick={() => exportarExcel(estadosTar as unknown as Record<string, unknown>[], [
                  { titulo: 'Tipo', campo: 'codigo_tipo_tarea' },
                  { titulo: 'Codigo', campo: 'codigo_estado_tarea' },
                  { titulo: 'Nombre', campo: 'nombre' },
                  { titulo: 'Canonico', campo: 'codigo_estado_canonico' },
                  { titulo: 'Orden', campo: 'orden' },
                  { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
                ], `estados_tarea${filtroTipoTar ? '_' + filtroTipoTar : ''}`)}
                disabled={estadosTar.length === 0}
              >
                <Download size={15} />
                Excel
              </Boton>
              <Boton variante="primario" onClick={abrirNuevoEstadoTar}>
                <Plus size={16} />
                Nuevo estado
              </Boton>
            </div>
          </div>

          {cargandoEstadosTar ? skeleton : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  <TablaTh>Tipo</TablaTh>
                  <TablaTh>Codigo</TablaTh>
                  <TablaTh>Nombre</TablaTh>
                  <TablaTh>Canonico</TablaTh>
                  <TablaTh>Orden</TablaTh>
                  <TablaTh>Estado</TablaTh>
                  <TablaTh className="text-right">Acciones</TablaTh>
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {estadosTar.length === 0 ? (
                  <TablaFila>
                    <TablaTd className="text-center text-texto-muted py-8" colSpan={7 as never}>
                      No hay estados de tarea registrados
                    </TablaTd>
                  </TablaFila>
                ) : (
                  estadosTar.map((e) => (
                    <TablaFila key={`${e.codigo_tipo_tarea}/${e.codigo_estado_tarea}`}>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {e.codigo_tipo_tarea}
                        </code>
                      </TablaTd>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {e.codigo_estado_tarea}
                        </code>
                      </TablaTd>
                      <TablaTd className="font-medium">{e.nombre}</TablaTd>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {e.codigo_estado_canonico}
                        </code>
                      </TablaTd>
                      <TablaTd>{e.orden}</TablaTd>
                      <TablaTd>
                        <button onClick={() => toggleActivoEstadoTar(e)} title="Cambiar estado">
                          <Insignia variante={e.activo ? 'exito' : 'error'}>
                            {e.activo ? 'Activo' : 'Inactivo'}
                          </Insignia>
                        </button>
                      </TablaTd>
                      <TablaTd>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditarEstadoTar(e)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setItemAEliminar({ tipo: 'estado-cmp', item: e as unknown as Record<string, unknown> })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TablaTd>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          )}
        </>
      )}

      {/* ── Tab: Canonicos Conversacion ── */}
      {tabActiva === 'canonicos-conversacion' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-texto-muted">
              Estados canonicos globales para conversaciones (no dependen de grupo)
            </p>
            <div className="flex gap-2">
              <Boton
                variante="contorno"
                tamano="sm"
                onClick={() => exportarExcel(canonicosCnv as unknown as Record<string, unknown>[], [
                  { titulo: 'Codigo', campo: 'codigo_estado_canonico' },
                  { titulo: 'Nombre', campo: 'nombre' },
                  { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
                ], 'canonicos_conversacion')}
                disabled={canonicosCnv.length === 0}
              >
                <Download size={15} />
                Excel
              </Boton>
              <Boton variante="primario" onClick={abrirNuevoCanCnv}>
                <Plus size={16} />
                Nuevo canonico
              </Boton>
            </div>
          </div>

          {cargandoCanonicosCnv ? skeleton : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  <TablaTh>Codigo</TablaTh>
                  <TablaTh>Nombre</TablaTh>
                  <TablaTh>Estado</TablaTh>
                  <TablaTh className="text-right">Acciones</TablaTh>
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {canonicosCnv.length === 0 ? (
                  <TablaFila>
                    <TablaTd className="text-center text-texto-muted py-8" colSpan={4 as never}>
                      No hay estados canonicos de conversacion registrados
                    </TablaTd>
                  </TablaFila>
                ) : (
                  canonicosCnv.map((c) => (
                    <TablaFila key={c.codigo_estado_canonico}>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {c.codigo_estado_canonico}
                        </code>
                      </TablaTd>
                      <TablaTd className="font-medium">{c.nombre}</TablaTd>
                      <TablaTd>
                        <button onClick={() => toggleActivoCanCnv(c)} title="Cambiar estado">
                          <Insignia variante={c.activo ? 'exito' : 'error'}>
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </Insignia>
                        </button>
                      </TablaTd>
                      <TablaTd>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditarCanCnv(c)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setItemAEliminar({ tipo: 'can-cnv', item: c as unknown as Record<string, unknown> })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TablaTd>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          )}
        </>
      )}

      {/* ── Tab: Canonicos Tarea ── */}
      {tabActiva === 'canonicos-tarea' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-texto-muted">
              Estados canonicos globales para tareas (no dependen de grupo)
            </p>
            <div className="flex gap-2">
              <Boton
                variante="contorno"
                tamano="sm"
                onClick={() => exportarExcel(canonicosTar as unknown as Record<string, unknown>[], [
                  { titulo: 'Codigo', campo: 'codigo_estado_canonico' },
                  { titulo: 'Nombre', campo: 'nombre' },
                  { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
                ], 'canonicos_tarea')}
                disabled={canonicosTar.length === 0}
              >
                <Download size={15} />
                Excel
              </Boton>
              <Boton variante="primario" onClick={abrirNuevoCanTar}>
                <Plus size={16} />
                Nuevo canonico
              </Boton>
            </div>
          </div>

          {cargandoCanonicosTar ? skeleton : (
            <Tabla>
              <TablaCabecera>
                <tr>
                  <TablaTh>Codigo</TablaTh>
                  <TablaTh>Nombre</TablaTh>
                  <TablaTh>Estado</TablaTh>
                  <TablaTh className="text-right">Acciones</TablaTh>
                </tr>
              </TablaCabecera>
              <TablaCuerpo>
                {canonicosTar.length === 0 ? (
                  <TablaFila>
                    <TablaTd className="text-center text-texto-muted py-8" colSpan={4 as never}>
                      No hay estados canonicos de tarea registrados
                    </TablaTd>
                  </TablaFila>
                ) : (
                  canonicosTar.map((c) => (
                    <TablaFila key={c.codigo_estado_canonico}>
                      <TablaTd>
                        <code className="text-xs bg-surface border border-borde rounded px-1.5 py-0.5">
                          {c.codigo_estado_canonico}
                        </code>
                      </TablaTd>
                      <TablaTd className="font-medium">{c.nombre}</TablaTd>
                      <TablaTd>
                        <button onClick={() => toggleActivoCanTar(c)} title="Cambiar estado">
                          <Insignia variante={c.activo ? 'exito' : 'error'}>
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </Insignia>
                        </button>
                      </TablaTd>
                      <TablaTd>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => abrirEditarCanTar(c)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setItemAEliminar({ tipo: 'can-cmp', item: c as unknown as Record<string, unknown> })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TablaTd>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          )}
        </>
      )}

      {/* ── Modal: Tipo Conversacion ── */}
      <Modal
        abierto={modalTipoCnv}
        alCerrar={() => setModalTipoCnv(false)}
        titulo={tipoCnvEditando ? 'Editar tipo de conversacion' : 'Nuevo tipo de conversacion'}
      >
        <div className="flex flex-col gap-4">
          <Input
            etiqueta="Codigo *"
            value={formTipoCnv.codigo_tipo_conversacion}
            onChange={(e) => setFormTipoCnv({ ...formTipoCnv, codigo_tipo_conversacion: e.target.value })}
            disabled={!!tipoCnvEditando}
            placeholder="REUNION"
          />
          <Input
            etiqueta="Nombre *"
            value={formTipoCnv.nombre}
            onChange={(e) => setFormTipoCnv({ ...formTipoCnv, nombre: e.target.value })}
            placeholder="Reunion"
          />
          <Input
            etiqueta="Descripcion"
            value={formTipoCnv.descripcion}
            onChange={(e) => setFormTipoCnv({ ...formTipoCnv, descripcion: e.target.value })}
            placeholder="Descripcion opcional"
          />
          {errorTipoCnv && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{errorTipoCnv}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalTipoCnv(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarTipoCnv} cargando={guardandoTipoCnv}>
              {tipoCnvEditando ? 'Guardar cambios' : 'Crear tipo'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Estado Conversacion ── */}
      <Modal
        abierto={modalEstadoCnv}
        alCerrar={() => setModalEstadoCnv(false)}
        titulo={estadoCnvEditando ? 'Editar estado de conversacion' : 'Nuevo estado de conversacion'}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-texto">Tipo de conversacion *</label>
            <select
              value={formEstadoCnv.codigo_tipo_conversacion}
              onChange={(e) => setFormEstadoCnv({ ...formEstadoCnv, codigo_tipo_conversacion: e.target.value })}
              disabled={!!estadoCnvEditando}
              className="w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario disabled:opacity-60"
            >
              <option value="">Seleccionar tipo...</option>
              {tiposCnv.filter((t) => t.activo).map((t) => (
                <option key={t.codigo_tipo_conversacion} value={t.codigo_tipo_conversacion}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <Input
            etiqueta="Codigo *"
            value={formEstadoCnv.codigo_estado_conversacion}
            onChange={(e) => setFormEstadoCnv({ ...formEstadoCnv, codigo_estado_conversacion: e.target.value })}
            disabled={!!estadoCnvEditando}
            placeholder="PENDIENTE"
          />
          <Input
            etiqueta="Nombre *"
            value={formEstadoCnv.nombre}
            onChange={(e) => setFormEstadoCnv({ ...formEstadoCnv, nombre: e.target.value })}
            placeholder="Pendiente"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-texto">Estado canonico *</label>
            <select
              value={formEstadoCnv.codigo_estado_canonico}
              onChange={(e) => setFormEstadoCnv({ ...formEstadoCnv, codigo_estado_canonico: e.target.value })}
              className="w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario"
            >
              <option value="">Seleccionar canonico...</option>
              {canonicosCnv.filter((c) => c.activo).map((c) => (
                <option key={c.codigo_estado_canonico} value={c.codigo_estado_canonico}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <Input
            etiqueta="Orden"
            type="number"
            value={String(formEstadoCnv.orden)}
            onChange={(e) => setFormEstadoCnv({ ...formEstadoCnv, orden: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
          {errorEstadoCnv && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{errorEstadoCnv}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalEstadoCnv(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarEstadoCnv} cargando={guardandoEstadoCnv}>
              {estadoCnvEditando ? 'Guardar cambios' : 'Crear estado'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Tipo Tarea ── */}
      <Modal
        abierto={modalTipoTar}
        alCerrar={() => setModalTipoTar(false)}
        titulo={tipoTarEditando ? 'Editar tipo de tarea' : 'Nuevo tipo de tarea'}
      >
        <div className="flex flex-col gap-4">
          <Input
            etiqueta="Codigo *"
            value={formTipoTar.codigo_tipo_tarea}
            onChange={(e) => setFormTipoTar({ ...formTipoTar, codigo_tipo_tarea: e.target.value })}
            disabled={!!tipoTarEditando}
            placeholder="TAREA"
          />
          <Input
            etiqueta="Nombre *"
            value={formTipoTar.nombre}
            onChange={(e) => setFormTipoTar({ ...formTipoTar, nombre: e.target.value })}
            placeholder="Tarea"
          />
          <Input
            etiqueta="Descripcion"
            value={formTipoTar.descripcion}
            onChange={(e) => setFormTipoTar({ ...formTipoTar, descripcion: e.target.value })}
            placeholder="Descripcion opcional"
          />
          {errorTipoTar && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{errorTipoTar}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalTipoTar(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarTipoTar} cargando={guardandoTipoTar}>
              {tipoTarEditando ? 'Guardar cambios' : 'Crear tipo'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Estado Tarea ── */}
      <Modal
        abierto={modalEstadoTar}
        alCerrar={() => setModalEstadoTar(false)}
        titulo={estadoTarEditando ? 'Editar estado de tarea' : 'Nuevo estado de tarea'}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-texto">Tipo de compromiso *</label>
            <select
              value={formEstadoTar.codigo_tipo_tarea}
              onChange={(e) => setFormEstadoTar({ ...formEstadoTar, codigo_tipo_tarea: e.target.value })}
              disabled={!!estadoTarEditando}
              className="w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario disabled:opacity-60"
            >
              <option value="">Seleccionar tipo...</option>
              {tiposTar.filter((t) => t.activo).map((t) => (
                <option key={t.codigo_tipo_tarea} value={t.codigo_tipo_tarea}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <Input
            etiqueta="Codigo *"
            value={formEstadoTar.codigo_estado_tarea}
            onChange={(e) => setFormEstadoTar({ ...formEstadoTar, codigo_estado_tarea: e.target.value })}
            disabled={!!estadoTarEditando}
            placeholder="PENDIENTE"
          />
          <Input
            etiqueta="Nombre *"
            value={formEstadoTar.nombre}
            onChange={(e) => setFormEstadoTar({ ...formEstadoTar, nombre: e.target.value })}
            placeholder="Pendiente"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-texto">Estado canonico *</label>
            <select
              value={formEstadoTar.codigo_estado_canonico}
              onChange={(e) => setFormEstadoTar({ ...formEstadoTar, codigo_estado_canonico: e.target.value })}
              className="w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario"
            >
              <option value="">Seleccionar canonico...</option>
              {canonicosTar.filter((c) => c.activo).map((c) => (
                <option key={c.codigo_estado_canonico} value={c.codigo_estado_canonico}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <Input
            etiqueta="Orden"
            type="number"
            value={String(formEstadoTar.orden)}
            onChange={(e) => setFormEstadoTar({ ...formEstadoTar, orden: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
          {errorEstadoTar && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{errorEstadoTar}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalEstadoTar(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarEstadoTar} cargando={guardandoEstadoTar}>
              {estadoTarEditando ? 'Guardar cambios' : 'Crear estado'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Canonico Conversacion ── */}
      <Modal
        abierto={modalCanCnv}
        alCerrar={() => setModalCanCnv(false)}
        titulo={canCnvEditando ? 'Editar estado canonico de conversacion' : 'Nuevo estado canonico de conversacion'}
      >
        <div className="flex flex-col gap-4">
          <Input
            etiqueta="Codigo *"
            value={formCanCnv.codigo_estado_canonico}
            onChange={(e) => setFormCanCnv({ ...formCanCnv, codigo_estado_canonico: e.target.value })}
            disabled={!!canCnvEditando}
            placeholder="ABIERTA"
          />
          <Input
            etiqueta="Nombre *"
            value={formCanCnv.nombre}
            onChange={(e) => setFormCanCnv({ ...formCanCnv, nombre: e.target.value })}
            placeholder="Abierta"
          />
          {errorCanCnv && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{errorCanCnv}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalCanCnv(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarCanCnv} cargando={guardandoCanCnv}>
              {canCnvEditando ? 'Guardar cambios' : 'Crear canonico'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Canonico Tarea ── */}
      <Modal
        abierto={modalCanTar}
        alCerrar={() => setModalCanTar(false)}
        titulo={canTarEditando ? 'Editar estado canonico de tarea' : 'Nuevo estado canonico de tarea'}
      >
        <div className="flex flex-col gap-4">
          <Input
            etiqueta="Codigo *"
            value={formCanTar.codigo_estado_canonico}
            onChange={(e) => setFormCanTar({ ...formCanTar, codigo_estado_canonico: e.target.value })}
            disabled={!!canTarEditando}
            placeholder="PENDIENTE"
          />
          <Input
            etiqueta="Nombre *"
            value={formCanTar.nombre}
            onChange={(e) => setFormCanTar({ ...formCanTar, nombre: e.target.value })}
            placeholder="Pendiente"
          />
          {errorCanTar && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{errorCanTar}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalCanTar(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarCanTar} cargando={guardandoCanTar}>
              {canTarEditando ? 'Guardar cambios' : 'Crear canonico'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* ── Modal Confirmar Eliminacion ── */}
      <ModalConfirmar
        abierto={!!itemAEliminar}
        alCerrar={() => setItemAEliminar(null)}
        alConfirmar={ejecutarEliminacion}
        titulo="Eliminar registro"
        mensaje={`Estas seguro de eliminar "${(itemAEliminar?.item as Record<string, unknown>)?.nombre || ''}"? Esta accion no se puede deshacer.`}
        textoConfirmar="Eliminar"
        variante="peligro"
        cargando={eliminandoItem}
      />
    </div>
  )
}
