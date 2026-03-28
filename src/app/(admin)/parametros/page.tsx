'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, SlidersHorizontal, Layers, Building2, User } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Tarjeta, TarjetaCabecera, TarjetaTitulo, TarjetaDescripcion, TarjetaContenido } from '@/components/ui/tarjeta'
import { useAuth } from '@/context/AuthContext'
import { parametrosApi, entidadesApi } from '@/lib/api'

type TabId = 'generales' | 'grupo' | 'entidad' | 'usuario'

interface ParametroRow {
  categoria_parametro: string
  tipo_parametro: string
  valor_parametro: string
  descripcion?: string
}

export default function PaginaParametros() {
  const { esAdmin, esSuperAdmin, usuario } = useAuth()
  const [tabActiva, setTabActiva] = useState<TabId>('generales')

  // Generales
  const [paramsGenerales, setParamsGenerales] = useState<ParametroRow[]>([])
  const [cargandoGenerales, setCargandoGenerales] = useState(false)

  // Grupo
  const [paramsGrupo, setParamsGrupo] = useState<ParametroRow[]>([])
  const [cargandoGrupo, setCargandoGrupo] = useState(false)

  // Entidad
  const [paramsEntidad, setParamsEntidad] = useState<ParametroRow[]>([])
  const [cargandoEntidad, setCargandoEntidad] = useState(false)

  // Usuario
  const [paramsUsuario, setParamsUsuario] = useState<ParametroRow[]>([])
  const [cargandoUsuario, setCargandoUsuario] = useState(false)

  // Nuevo parámetro (para grupo, entidad, usuario)
  const [nuevoParam, setNuevoParam] = useState({ categoria_parametro: '', tipo_parametro: '', valor_parametro: '' })

  const [guardando, setGuardando] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState('')
  const [error, setError] = useState('')

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg)
    setError('')
    setTimeout(() => setMensajeExito(''), 3000)
  }

  // ── Cargar Generales ──────────────────────────────────────────────────────
  const cargarGenerales = useCallback(async () => {
    setCargandoGenerales(true)
    try {
      const data = await parametrosApi.listarGenerales()
      // El backend devuelve formato diferente, mapeamos
      setParamsGenerales(data.map((p: Record<string, string>) => ({
        categoria_parametro: p.categoria_parametro,
        tipo_parametro: p.tipo_parametro,
        valor_parametro: p.valor_parametro,
        descripcion: p.descripcion,
      })))
    } catch { setParamsGenerales([]) }
    finally { setCargandoGenerales(false) }
  }, [])

  // ── Cargar Grupo ──────────────────────────────────────────────────────────
  const cargarGrupo = useCallback(async () => {
    setCargandoGrupo(true)
    try {
      const data = await parametrosApi.listarGrupo()
      setParamsGrupo(data)
    } catch { setParamsGrupo([]) }
    finally { setCargandoGrupo(false) }
  }, [])

  // ── Cargar Entidad ────────────────────────────────────────────────────────
  const cargarEntidad = useCallback(async () => {
    if (!usuario?.entidad_activa) return
    setCargandoEntidad(true)
    try {
      const data = await entidadesApi.listarParametros(usuario.entidad_activa)
      setParamsEntidad(data)
    } catch { setParamsEntidad([]) }
    finally { setCargandoEntidad(false) }
  }, [usuario?.entidad_activa])

  // ── Cargar Usuario ────────────────────────────────────────────────────────
  const cargarUsuario = useCallback(async () => {
    setCargandoUsuario(true)
    try {
      const data = await parametrosApi.listarUsuario()
      setParamsUsuario(data.map((p: Record<string, string>) => ({
        categoria_parametro: p.categoria_parametro,
        tipo_parametro: p.tipo_parametro,
        valor_parametro: p.valor_parametro,
      })))
    } catch { setParamsUsuario([]) }
    finally { setCargandoUsuario(false) }
  }, [])

  useEffect(() => {
    if (tabActiva === 'generales') cargarGenerales()
    else if (tabActiva === 'grupo') cargarGrupo()
    else if (tabActiva === 'entidad') cargarEntidad()
    else if (tabActiva === 'usuario') cargarUsuario()
  }, [tabActiva, cargarGenerales, cargarGrupo, cargarEntidad, cargarUsuario])

  // ── Guardar parámetro inline ──────────────────────────────────────────────
  const guardarInline = async (tab: TabId, cat: string, tipo: string, valor: string) => {
    const key = `${cat}/${tipo}`
    setGuardando(key)
    setError('')
    try {
      const datos = { categoria_parametro: cat, tipo_parametro: tipo, valor_parametro: valor }
      if (tab === 'generales') {
        await parametrosApi.upsertGenerales(datos)
      } else if (tab === 'grupo') {
        await parametrosApi.upsertGrupo(datos)
      } else if (tab === 'entidad' && usuario?.entidad_activa) {
        await entidadesApi.upsertParametro(usuario.entidad_activa, datos)
      } else if (tab === 'usuario') {
        await parametrosApi.upsertUsuario(datos)
      }
      mostrarExito('Parámetro guardado')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(null)
    }
  }

  // ── Agregar nuevo parámetro ───────────────────────────────────────────────
  const agregarNuevo = async () => {
    if (!nuevoParam.categoria_parametro || !nuevoParam.tipo_parametro || !nuevoParam.valor_parametro) {
      setError('Todos los campos son obligatorios')
      return
    }
    await guardarInline(tabActiva, nuevoParam.categoria_parametro, nuevoParam.tipo_parametro, nuevoParam.valor_parametro)
    setNuevoParam({ categoria_parametro: '', tipo_parametro: '', valor_parametro: '' })
    // Recargar
    if (tabActiva === 'generales') cargarGenerales()
    else if (tabActiva === 'grupo') cargarGrupo()
    else if (tabActiva === 'entidad') cargarEntidad()
    else if (tabActiva === 'usuario') cargarUsuario()
  }

  // ── Tabs config ───────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: typeof SlidersHorizontal; visible: boolean }[] = [
    { id: 'generales', label: 'Generales', icon: SlidersHorizontal, visible: esAdmin() },
    { id: 'grupo', label: 'Por Grupo', icon: Layers, visible: true },
    { id: 'entidad', label: 'Por Entidad', icon: Building2, visible: true },
    { id: 'usuario', label: 'Por Usuario', icon: User, visible: true },
  ]

  const visibleTabs = tabs.filter((t) => t.visible)

  // Si la tab activa no es visible, cambiar a la primera visible
  useEffect(() => {
    if (!visibleTabs.find((t) => t.id === tabActiva)) {
      setTabActiva(visibleTabs[0]?.id || 'grupo')
    }
  }, [visibleTabs, tabActiva])

  // Datos y estado de carga según tab
  const getParams = (): ParametroRow[] => {
    if (tabActiva === 'generales') return paramsGenerales
    if (tabActiva === 'grupo') return paramsGrupo
    if (tabActiva === 'entidad') return paramsEntidad
    return paramsUsuario
  }

  const isCargando = (): boolean => {
    if (tabActiva === 'generales') return cargandoGenerales
    if (tabActiva === 'grupo') return cargandoGrupo
    if (tabActiva === 'entidad') return cargandoEntidad
    return cargandoUsuario
  }

  const getDescripcion = (): string => {
    if (tabActiva === 'generales') return 'Parámetros que afectan a todos los usuarios del sistema'
    if (tabActiva === 'grupo') return `Parámetros del grupo "${usuario?.nombre_grupo || usuario?.grupo_activo}"`
    if (tabActiva === 'entidad') return `Parámetros de la entidad "${usuario?.entidad_activa}"`
    return 'Parámetros personales del usuario actual'
  }

  const puedeAgregar = tabActiva !== 'generales' || esAdmin()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Parámetros</h2>
        <p className="text-sm text-texto-muted mt-1">Configuración del sistema en múltiples niveles</p>
      </div>

      {mensajeExito && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-exito font-medium">{mensajeExito}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-error font-medium">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-fondo rounded-lg border border-borde w-fit">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tabActiva === tab.id
                  ? 'bg-surface text-primario shadow-sm border border-borde'
                  : 'text-texto-muted hover:text-texto'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <Tarjeta>
        <TarjetaCabecera>
          <TarjetaTitulo>
            {visibleTabs.find((t) => t.id === tabActiva)?.label || 'Parámetros'}
          </TarjetaTitulo>
          <TarjetaDescripcion>{getDescripcion()}</TarjetaDescripcion>
        </TarjetaCabecera>
        <TarjetaContenido>
          {isCargando() ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-fondo rounded-lg animate-pulse" />
              ))}
            </div>
          ) : getParams().length === 0 ? (
            <p className="text-sm text-texto-muted text-center py-4">No hay parámetros configurados</p>
          ) : (
            <div className="flex flex-col gap-3">
              {getParams().map((p) => {
                const key = `${p.categoria_parametro}/${p.tipo_parametro}`
                return (
                  <div key={key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-borde bg-surface">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-texto-muted mb-1">
                        {p.categoria_parametro} / {p.tipo_parametro}
                      </p>
                      <input
                        type="text"
                        defaultValue={p.valor_parametro}
                        onBlur={(e) => {
                          if (e.target.value !== p.valor_parametro) {
                            guardarInline(tabActiva, p.categoria_parametro, p.tipo_parametro, e.target.value)
                          }
                        }}
                        className="w-full text-sm text-texto bg-transparent border-b border-transparent hover:border-borde focus:border-primario focus:outline-none py-0.5"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)
                        if (input) guardarInline(tabActiva, p.categoria_parametro, p.tipo_parametro, input.value)
                      }}
                      disabled={guardando === key}
                      className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors shrink-0"
                      title="Guardar"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Agregar nuevo parámetro */}
          {puedeAgregar && (
            <div className="border-t border-borde mt-4 pt-4">
              <p className="text-xs font-semibold text-texto-muted uppercase tracking-wider mb-2">Agregar parámetro</p>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Categoría"
                    value={nuevoParam.categoria_parametro}
                    onChange={(e) => setNuevoParam({ ...nuevoParam, categoria_parametro: e.target.value.toUpperCase() })}
                    className="rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-1 focus:ring-primario"
                  />
                  <input
                    type="text"
                    placeholder="Tipo"
                    value={nuevoParam.tipo_parametro}
                    onChange={(e) => setNuevoParam({ ...nuevoParam, tipo_parametro: e.target.value.toUpperCase() })}
                    className="rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-1 focus:ring-primario"
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    value={nuevoParam.valor_parametro}
                    onChange={(e) => setNuevoParam({ ...nuevoParam, valor_parametro: e.target.value })}
                    className="rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-1 focus:ring-primario"
                  />
                </div>
                <Boton variante="contorno" tamano="sm" onClick={agregarNuevo} cargando={guardando === 'nuevo'}>
                  Agregar
                </Boton>
              </div>
            </div>
          )}
        </TarjetaContenido>
      </Tarjeta>
    </div>
  )
}
