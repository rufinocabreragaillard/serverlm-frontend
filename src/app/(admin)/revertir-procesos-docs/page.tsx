'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Play, AlertTriangle, Loader2, ChevronDown, ChevronRight, X, Search, CheckCircle } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Insignia } from '@/components/ui/insignia'
import { Tarjeta, TarjetaContenido } from '@/components/ui/tarjeta'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { documentosApi, ubicacionesDocsApi, procesosApi } from '@/lib/api'
import type { Proceso as ProcesoCatalogo } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface UbicacionOption {
  codigo_ubicacion: string
  nombre_ubicacion: string
  ruta_completa: string
  nivel: number
  tipo_ubicacion?: 'AREA' | 'CONTENIDO'
  codigo_ubicacion_superior?: string
}

export default function PaginaRevertirProcesarDocs() {
  const { grupoActivo } = useAuth()

  // Catálogos
  const [procesos, setProcesos] = useState<ProcesoCatalogo[]>([])
  const [ubicaciones, setUbicaciones] = useState<UbicacionOption[]>([])
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [errorCargaInicial, setErrorCargaInicial] = useState(false)

  // Filtros
  const [procesoSel, setProcesoSel] = useState('')
  const [filtroLibre, setFiltroLibre] = useState('')
  const [filtroLibreInput, setFiltroLibreInput] = useState('')
  const [ubicacionSel, setUbicacionSel] = useState('')
  const [ubicBusqueda, setUbicBusqueda] = useState('')
  const [ubicDropdownOpen, setUbicDropdownOpen] = useState(false)
  const [ubicExpandidos, setUbicExpandidos] = useState<Set<string>>(new Set())
  const [tope, setTope] = useState('')
  const ubicDropdownRef = useRef<HTMLDivElement>(null)

  // Estado de la operación
  const [conteo, setConteo] = useState<number | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [ejecutando, setEjecutando] = useState(false)
  const [resultado, setResultado] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmEjecutar, setConfirmEjecutar] = useState(false)

  const pasoActual = useMemo(() => {
    const p = procesos.find((x) => x.codigo_proceso === procesoSel)
    return p?.pasos?.[0] || null
  }, [procesos, procesoSel])

  const cargarDatosIniciales = useCallback(async () => {
    setCargandoInicial(true)
    setErrorCargaInicial(false)
    try {
      const [procsRaw, u] = await Promise.all([
        procesosApi.listar('DOCUMENTOS'),
        ubicacionesDocsApi.listar().catch(() => []),
      ])
      const procs = (procsRaw || [])
        .filter((p: ProcesoCatalogo) => p.pasos && p.pasos.length > 0 && p.codigo_funcion === 'REVERT_PROC_DOCS')
        .sort((a: ProcesoCatalogo, b: ProcesoCatalogo) => (a.orden ?? 0) - (b.orden ?? 0))
      setProcesos(procs)
      setUbicaciones(
        (u as UbicacionOption[])
          .filter((x) => (x as UbicacionOption & { activo?: boolean }).activo !== false)
          .sort((a, b) => (a.ruta_completa || '').localeCompare(b.ruta_completa || ''))
      )
    } catch {
      setErrorCargaInicial(true)
    } finally {
      setCargandoInicial(false)
    }
  }, [])

  useEffect(() => { cargarDatosIniciales() }, [cargarDatosIniciales])

  // Click-outside para cerrar dropdown de ubicación
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ubicDropdownRef.current && !ubicDropdownRef.current.contains(e.target as Node)) {
        setUbicDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Resetear resultado/conteo al cambiar filtros
  useEffect(() => {
    setConteo(null)
    setResultado(null)
    setError(null)
  }, [procesoSel, filtroLibre, ubicacionSel, tope])

  const buildParams = (soloContar: boolean) => ({
    estados_origen: pasoActual?.estado_origen ? [pasoActual.estado_origen] : [],
    estado_destino: pasoActual?.estado_destino || '',
    q: filtroLibre || undefined,
    codigo_ubicacion: ubicacionSel || undefined,
    tope: tope ? parseInt(tope) : undefined,
    solo_contar: soloContar,
  })

  const buscar = async () => {
    if (!pasoActual) return
    setBuscando(true)
    setConteo(null)
    setResultado(null)
    setError(null)
    try {
      const r = await documentosApi.revertir(buildParams(true))
      setConteo(r.conteo)
    } catch {
      setError('Error al consultar la cantidad de documentos.')
    } finally {
      setBuscando(false)
    }
  }

  const ejecutar = async () => {
    if (!pasoActual || conteo === null || conteo === 0) return
    setEjecutando(true)
    setConfirmEjecutar(false)
    setError(null)
    try {
      const r = await documentosApi.revertir(buildParams(false))
      setResultado(r.revertidos)
      setConteo(null)
    } catch {
      setError('Error al ejecutar el proceso de reversa.')
    } finally {
      setEjecutando(false)
    }
  }

  const selectClass = 'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario'

  // Árbol de ubicaciones
  const ubicacionesRaiz = ubicaciones.filter((u) => !u.codigo_ubicacion_superior)
  const ubicacionesHijas = (codigoPadre: string) =>
    ubicaciones.filter((u) => u.codigo_ubicacion_superior === codigoPadre)

  const renderUbicacion = (u: UbicacionOption): React.ReactNode => {
    const hijas = ubicacionesHijas(u.codigo_ubicacion)
    const expandida = ubicExpandidos.has(u.codigo_ubicacion)
    const matchBusqueda = !ubicBusqueda || u.nombre_ubicacion.toLowerCase().includes(ubicBusqueda.toLowerCase()) || u.ruta_completa.toLowerCase().includes(ubicBusqueda.toLowerCase())
    if (!matchBusqueda && hijas.length === 0) return null
    return (
      <div key={u.codigo_ubicacion}>
        <button
          type="button"
          className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm hover:bg-primario-muy-claro rounded transition-colors ${ubicacionSel === u.codigo_ubicacion ? 'bg-primario-muy-claro text-primario font-medium' : 'text-texto'}`}
          style={{ paddingLeft: `${(u.nivel ?? 0) * 12 + 8}px` }}
          onClick={() => {
            setUbicacionSel(u.codigo_ubicacion === ubicacionSel ? '' : u.codigo_ubicacion)
            setUbicDropdownOpen(false)
          }}
        >
          {hijas.length > 0 && (
            <span onClick={(e) => {
              e.stopPropagation()
              setUbicExpandidos((prev) => {
                const s = new Set(prev)
                s.has(u.codigo_ubicacion) ? s.delete(u.codigo_ubicacion) : s.add(u.codigo_ubicacion)
                return s
              })
            }}>
              {expandida ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          <span className="truncate">{u.nombre_ubicacion}</span>
        </button>
        {expandida && hijas.map((h) => renderUbicacion(h))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-x-hidden">
      <div>
        <h2 className="page-heading">Revertir Procesos Docs.</h2>
        <p className="text-sm text-texto-muted mt-1">
          Revierte documentos a estados anteriores del pipeline (ej. VECTORIZADO → CHUNKEADO).
          Usa los filtros, presiona <strong>Buscar</strong> para ver cuántos docs se verán afectados
          y luego <strong>Ejecutar</strong> para aplicar el cambio.
        </p>
      </div>

      {errorCargaInicial && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-error">
          <AlertTriangle size={16} className="shrink-0" />
          <span>No se pudieron cargar los procesos. El servidor puede estar iniciando.</span>
          <Boton variante="contorno" tamano="sm" onClick={cargarDatosIniciales} disabled={cargandoInicial}>
            {cargandoInicial ? <Loader2 size={14} className="animate-spin" /> : null}
            Reintentar
          </Boton>
        </div>
      )}

      {/* Configuración */}
      <Tarjeta>
        <TarjetaContenido>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Proceso */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-texto">Proceso de Reversa</label>
              <select
                value={procesoSel}
                onChange={(e) => setProcesoSel(e.target.value)}
                className={selectClass}
                disabled={cargandoInicial || ejecutando}
              >
                <option value="">— Seleccionar proceso —</option>
                {procesos.map((p) => {
                  const paso = p.pasos?.[0]
                  const flecha = paso ? `${paso.estado_origen || '—'} → ${paso.estado_destino}` : ''
                  return (
                    <option key={p.codigo_proceso} value={p.codigo_proceso}>
                      {p.nombre_proceso} ({flecha})
                    </option>
                  )
                })}
              </select>
              {pasoActual && (
                <p className="text-xs text-texto-muted">
                  Revierte documentos en estado <Insignia variante="neutro">{pasoActual.estado_origen || '—'}</Insignia>
                  {' '}a <Insignia variante="neutro">{pasoActual.estado_destino}</Insignia>
                </p>
              )}
            </div>

            {/* Ubicación */}
            <div className="flex flex-col gap-1.5" ref={ubicDropdownRef}>
              <label className="text-sm font-medium text-texto">Ubicación</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => !ejecutando && setUbicDropdownOpen(!ubicDropdownOpen)}
                  disabled={ejecutando}
                  className="flex items-center gap-2 rounded-lg border border-borde bg-fondo-tarjeta px-4 py-2 text-sm text-texto hover:border-primario transition-colors w-full disabled:opacity-50"
                >
                  <span className="flex-1 text-left truncate">
                    {ubicacionSel
                      ? (ubicaciones.find(u => u.codigo_ubicacion === ubicacionSel)?.nombre_ubicacion || 'Seleccionar ubicación')
                      : 'Todas las ubicaciones'}
                  </span>
                  {ubicacionSel ? (
                    <X size={13} className="text-texto-muted hover:text-error shrink-0"
                      onClick={(e) => { e.stopPropagation(); setUbicacionSel(''); setUbicBusqueda(''); setUbicDropdownOpen(false) }}
                    />
                  ) : (
                    <ChevronDown size={13} className="text-texto-muted shrink-0" />
                  )}
                </button>
                {ubicDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-borde rounded-lg shadow-lg flex flex-col" style={{ maxHeight: '18rem' }}>
                    <div className="p-2 border-b border-borde shrink-0">
                      <input
                        type="text"
                        placeholder="Buscar ubicación…"
                        value={ubicBusqueda}
                        onChange={(e) => setUbicBusqueda(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm border border-borde rounded px-2 py-1 bg-fondo text-texto focus:outline-none focus:ring-1 focus:ring-primario placeholder:text-texto-muted"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                      {ubicacionesRaiz.map((u) => renderUbicacion(u))}
                      {ubicaciones.length === 0 && (
                        <p className="text-xs text-texto-muted px-2 py-3 text-center">Sin ubicaciones</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filtro libre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-texto">Filtro por nombre</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre del documento…"
                  value={filtroLibreInput}
                  onChange={(e) => setFiltroLibreInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setFiltroLibre(filtroLibreInput) }}
                  disabled={ejecutando}
                />
                <Boton variante="contorno" tamano="sm" onClick={() => setFiltroLibre(filtroLibreInput)} disabled={ejecutando}>
                  <Search size={14} />
                </Boton>
                {filtroLibre && (
                  <Boton variante="fantasma" tamano="sm" onClick={() => { setFiltroLibre(''); setFiltroLibreInput('') }}>
                    <X size={14} />
                  </Boton>
                )}
              </div>
            </div>
          </div>

          {/* Tope */}
          <div className="mt-4 flex flex-col gap-1.5 max-w-xs">
            <label className="text-sm font-medium text-texto">Máx. a revertir</label>
            <Input
              type="number"
              placeholder="Sin límite (todos los que coincidan)"
              value={tope}
              onChange={(e) => setTope(e.target.value)}
              min={1}
              disabled={ejecutando}
            />
          </div>
        </TarjetaContenido>
      </Tarjeta>

      {/* Botones de acción */}
      <div className="flex flex-wrap items-center gap-3">
        <Boton
          variante="contorno"
          onClick={buscar}
          disabled={buscando || ejecutando || !procesoSel}
        >
          {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </Boton>

        <Boton
          variante="primario"
          onClick={() => setConfirmEjecutar(true)}
          disabled={ejecutando || buscando || conteo === null || conteo === 0}
        >
          {ejecutando ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {conteo !== null && conteo > 0 ? `Ejecutar (${conteo} docs)` : 'Ejecutar'}
        </Boton>

        {conteo === 0 && (
          <Insignia variante="neutro">Sin documentos que revertir</Insignia>
        )}
      </div>

      {/* Resultado */}
      {resultado !== null && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={18} className="text-exito shrink-0" />
          <div>
            <p className="font-medium text-texto">Proceso completado</p>
            <p className="text-sm text-texto-muted">
              {resultado} documento{resultado !== 1 ? 's' : ''} revertido{resultado !== 1 ? 's' : ''}
              {pasoActual ? ` de ${pasoActual.estado_origen || '—'} a ${pasoActual.estado_destino}` : ''}.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-error">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Confirmación de ejecución */}
      <ModalConfirmar
        abierto={confirmEjecutar}
        titulo="Confirmar reversa"
        mensaje={`¿Revertir ${conteo} documento${conteo !== 1 ? 's' : ''}${pasoActual ? ` de "${pasoActual.estado_origen}" a "${pasoActual.estado_destino}"` : ''}? Esta acción no se puede deshacer.`}
        onConfirmar={ejecutar}
        onCancelar={() => setConfirmEjecutar(false)}
        cargando={ejecutando}
        variante="advertencia"
      />
    </div>
  )
}
