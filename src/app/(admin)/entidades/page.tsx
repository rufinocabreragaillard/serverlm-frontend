'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Building2, MapPin, Download, Search } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Insignia } from '@/components/ui/insignia'
import { Modal } from '@/components/ui/modal'
import { Tarjeta, TarjetaContenido } from '@/components/ui/tarjeta'
import { Tabla, TablaCabecera, TablaCuerpo, TablaFila, TablaTh, TablaTd } from '@/components/ui/tabla'
import { entidadesApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Entidad, Area } from '@/lib/tipos'
import { exportarExcel } from '@/lib/exportar-excel'

const selectClass = 'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario'

export default function PaginaEntidades() {
  const { grupoActivo } = useAuth()
  const [entidades, setEntidades] = useState<Entidad[]>([])
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<Entidad | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoAreas, setCargandoAreas] = useState(false)
  const [busquedaAreas, setBusquedaAreas] = useState('')

  const [modalEntidad, setModalEntidad] = useState(false)
  const [modalArea, setModalArea] = useState(false)
  const [entidadEditando, setEntidadEditando] = useState<Entidad | null>(null)
  const [formEntidad, setFormEntidad] = useState({ codigo_entidad: '', nombre: '', descripcion: '' })
  const [formArea, setFormArea] = useState({ codigo_area: '', nombre: '', descripcion: '', codigo_area_superior: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const e = await entidadesApi.listar()
      setEntidades(e)
      if (e.length > 0 && !entidadSeleccionada) setEntidadSeleccionada(e[0])
    } finally {
      setCargando(false)
    }
  }, [entidadSeleccionada])

  const cargarAreas = useCallback(async (codigoEntidad: string) => {
    setCargandoAreas(true)
    try {
      const a = await entidadesApi.listarAreas(codigoEntidad)
      setAreas(a)
    } finally {
      setCargandoAreas(false)
    }
  }, [])

  useEffect(() => { cargar() }, []) // eslint-disable-line

  useEffect(() => {
    if (entidadSeleccionada) {
      cargarAreas(entidadSeleccionada.codigo_entidad)
      setBusquedaAreas('')
    }
  }, [entidadSeleccionada, cargarAreas])

  const abrirNuevaEntidad = () => {
    setEntidadEditando(null)
    setFormEntidad({ codigo_entidad: '', nombre: '', descripcion: '' })
    setError('')
    setModalEntidad(true)
  }

  const abrirEditarEntidad = (e: Entidad) => {
    setEntidadEditando(e)
    setFormEntidad({ codigo_entidad: e.codigo_entidad, nombre: e.nombre, descripcion: e.descripcion || '' })
    setError('')
    setModalEntidad(true)
  }

  const guardarEntidad = async () => {
    if (!formEntidad.codigo_entidad || !formEntidad.nombre) { setError('Código y nombre son obligatorios'); return }
    setGuardando(true)
    try {
      if (entidadEditando) {
        await entidadesApi.actualizar(entidadEditando.codigo_entidad, { nombre: formEntidad.nombre })
      } else {
        const { descripcion, ...datosLimpios } = formEntidad
        await entidadesApi.crear({ ...datosLimpios, codigo_grupo: grupoActivo || 'ADMIN' })
      }
      setModalEntidad(false)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setGuardando(false)
    }
  }

  const guardarArea = async () => {
    if (!entidadSeleccionada || !formArea.codigo_area || !formArea.nombre) { setError('Código y nombre son obligatorios'); return }
    setGuardando(true)
    try {
      const datos: Record<string, string> = {
        codigo_area: formArea.codigo_area,
        nombre: formArea.nombre,
      }
      if (formArea.descripcion) datos.descripcion = formArea.descripcion
      if (formArea.codigo_area_superior) datos.codigo_area_superior = formArea.codigo_area_superior
      await entidadesApi.crearArea(entidadSeleccionada.codigo_entidad, datos)
      setModalArea(false)
      cargarAreas(entidadSeleccionada.codigo_entidad)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setGuardando(false)
    }
  }

  // Áreas filtradas (mantiene orden jerárquico de la función SQL)
  const areasFiltradas = areas
    .filter((a) =>
      a.nombre.toLowerCase().includes(busquedaAreas.toLowerCase()) ||
      a.codigo_area.toLowerCase().includes(busquedaAreas.toLowerCase()) ||
      (a.usuario_responsable || '').toLowerCase().includes(busquedaAreas.toLowerCase())
    )

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-texto">Entidades y Áreas</h2>
          <p className="text-sm text-texto-muted mt-1">Gestión de organizaciones y sus áreas</p>
        </div>
        <div className="flex gap-2">
          <Boton
            variante="contorno"
            tamano="sm"
            onClick={() => exportarExcel(entidades as Record<string, unknown>[], [
              { titulo: 'Grupo', campo: 'codigo_grupo' },
              { titulo: 'Código', campo: 'codigo_entidad' },
              { titulo: 'Nombre', campo: 'nombre' },
              { titulo: 'Descripción', campo: 'descripcion' },
              { titulo: 'Estado', campo: 'activo', formato: (v) => v ? 'Activo' : 'Inactivo' },
              { titulo: 'Fecha creación', campo: 'fecha_creacion', formato: (v) => v ? new Date(v as string).toLocaleString('es-CL') : '' },
            ], `entidades_${grupoActivo || 'todos'}`)}
            disabled={entidades.length === 0}
          >
            <Download size={15} />
            Excel
          </Boton>
          <Boton variante="primario" onClick={abrirNuevaEntidad}><Plus size={16} />Nueva entidad</Boton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de entidades */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-texto-muted uppercase tracking-wider px-1">Entidades</h3>
          {cargando ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-surface border border-borde rounded-xl animate-pulse" />
              ))}
            </div>
          ) : entidades.map((e) => (
            <button
              key={e.codigo_entidad}
              onClick={() => setEntidadSeleccionada(e)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                entidadSeleccionada?.codigo_entidad === e.codigo_entidad
                  ? 'border-primario bg-primario-muy-claro'
                  : 'border-borde bg-surface hover:bg-fondo'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                entidadSeleccionada?.codigo_entidad === e.codigo_entidad
                  ? 'bg-primario text-white'
                  : 'bg-fondo text-texto-muted'
              }`}>
                <Building2 size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-texto truncate">{e.nombre}</p>
                <p className="text-xs text-texto-muted">{e.codigo_entidad}</p>
              </div>
              <button
                onClick={(ev) => { ev.stopPropagation(); abrirEditarEntidad(e) }}
                className="ml-auto p-1 rounded hover:bg-white text-texto-muted hover:text-primario transition-colors"
              >
                <Pencil size={13} />
              </button>
            </button>
          ))}
        </div>

        {/* Áreas de la entidad seleccionada */}
        <div className="lg:col-span-2">
          {entidadSeleccionada ? (
            <Tarjeta>
              <div className="px-6 py-4 border-b border-borde flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-texto">
                    Áreas de {entidadSeleccionada.nombre}
                  </h3>
                  <p className="text-xs text-texto-muted mt-0.5">
                    {areas.length} área{areas.length !== 1 ? 's' : ''} configurada{areas.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Boton
                    variante="contorno"
                    tamano="sm"
                    onClick={() => exportarExcel(areasFiltradas as Record<string, unknown>[], [
                      { titulo: 'Entidad', campo: 'codigo_entidad' },
                      { titulo: 'Código área', campo: 'codigo_area' },
                      { titulo: 'Nombre', campo: 'nombre' },
                      { titulo: 'Área superior', campo: 'codigo_area_superior' },
                      { titulo: 'Nivel', campo: 'nivel' },
                      { titulo: 'Descripción', campo: 'descripcion' },
                      { titulo: 'Responsable', campo: 'usuario_responsable' },
                      { titulo: 'Estado', campo: 'activo', formato: (v) => v === false ? 'Inactivo' : 'Activo' },
                    ], `areas_${entidadSeleccionada?.codigo_entidad || 'sin_entidad'}`)}
                    disabled={areasFiltradas.length === 0}
                  >
                    <Download size={14} />
                    Excel
                  </Boton>
                  <Boton
                    variante="contorno"
                    tamano="sm"
                    onClick={() => { setFormArea({ codigo_area: '', nombre: '', descripcion: '', codigo_area_superior: '' }); setError(''); setModalArea(true) }}
                  >
                    <Plus size={14} />
                    Nueva área
                  </Boton>
                </div>
              </div>
              {/* Buscador de áreas */}
              <div className="px-6 py-3 border-b border-borde">
                <div className="max-w-sm">
                  <Input
                    placeholder="Buscar por nombre, código o responsable..."
                    value={busquedaAreas}
                    onChange={(e) => setBusquedaAreas(e.target.value)}
                    icono={<Search size={15} />}
                  />
                </div>
              </div>
              <TarjetaContenido className="p-0">
                <Tabla>
                  <TablaCabecera>
                    <tr>
                      <TablaTh>Código</TablaTh>
                      <TablaTh>Nombre</TablaTh>
                      <TablaTh>Área superior</TablaTh>
                      <TablaTh>Responsable</TablaTh>
                    </tr>
                  </TablaCabecera>
                  <TablaCuerpo>
                    {cargandoAreas ? (
                      <TablaFila><TablaTd className="py-8 text-center text-texto-muted" colSpan={4 as never}>Cargando áreas...</TablaTd></TablaFila>
                    ) : areasFiltradas.length === 0 ? (
                      <TablaFila>
                        <TablaTd className="py-8 text-center" colSpan={4 as never}>
                          <div className="flex flex-col items-center gap-2 text-texto-muted">
                            <MapPin size={24} />
                            <p className="text-sm">{busquedaAreas ? 'No se encontraron áreas' : 'No hay áreas configuradas'}</p>
                          </div>
                        </TablaTd>
                      </TablaFila>
                    ) : areasFiltradas.map((a) => (
                      <TablaFila key={a.codigo_area}>
                        <TablaTd><code className="text-xs bg-fondo px-2 py-1 rounded font-mono">{a.codigo_area}</code></TablaTd>
                        <TablaTd>
                          <span className="font-medium" style={{ paddingLeft: `${(a.nivel || 0) * 1.25}rem` }}>
                            {(a.nivel || 0) > 0 && <span className="text-texto-muted mr-1">└</span>}
                            {a.nombre}
                          </span>
                        </TablaTd>
                        <TablaTd className="text-texto-muted text-xs">{a.codigo_area_superior || '—'}</TablaTd>
                        <TablaTd className="text-texto-muted text-xs">{a.usuario_responsable || '—'}</TablaTd>
                      </TablaFila>
                    ))}
                  </TablaCuerpo>
                </Tabla>
              </TarjetaContenido>
            </Tarjeta>
          ) : (
            <div className="flex items-center justify-center h-48 text-texto-muted text-sm">
              Selecciona una entidad para ver sus áreas
            </div>
          )}
        </div>
      </div>

      {/* Modal entidad */}
      <Modal abierto={modalEntidad} alCerrar={() => setModalEntidad(false)} titulo={entidadEditando ? 'Editar entidad' : 'Nueva entidad'}>
        <div className="flex flex-col gap-4">
          <Input etiqueta="Codigo *" value={formEntidad.codigo_entidad} onChange={(e) => setFormEntidad({ ...formEntidad, codigo_entidad: e.target.value.toUpperCase() })} disabled={!!entidadEditando} placeholder="MUNI" />
          <Input etiqueta="Nombre *" value={formEntidad.nombre} onChange={(e) => setFormEntidad({ ...formEntidad, nombre: e.target.value })} placeholder="Municipalidad de..." />
          <Input etiqueta="Descripcion" value={formEntidad.descripcion} onChange={(e) => setFormEntidad({ ...formEntidad, descripcion: e.target.value })} />
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-error">{error}</p></div>}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalEntidad(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarEntidad} cargando={guardando}>{entidadEditando ? 'Guardar' : 'Crear entidad'}</Boton>
          </div>
        </div>
      </Modal>

      {/* Modal área */}
      <Modal abierto={modalArea} alCerrar={() => setModalArea(false)} titulo="Nueva área" descripcion={`Para entidad: ${entidadSeleccionada?.nombre}`}>
        <div className="flex flex-col gap-4">
          <Input etiqueta="Código *" value={formArea.codigo_area} onChange={(e) => setFormArea({ ...formArea, codigo_area: e.target.value.toUpperCase() })} placeholder="ADMIN" />
          <Input etiqueta="Nombre *" value={formArea.nombre} onChange={(e) => setFormArea({ ...formArea, nombre: e.target.value })} placeholder="Administración" />
          <Input etiqueta="Descripción" value={formArea.descripcion} onChange={(e) => setFormArea({ ...formArea, descripcion: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-texto">Área superior</label>
            <select
              value={formArea.codigo_area_superior}
              onChange={(e) => setFormArea({ ...formArea, codigo_area_superior: e.target.value })}
              className={selectClass}
            >
              <option value="">Sin área superior</option>
              {areas.filter((a) => a.codigo_area !== formArea.codigo_area).map((a) => (
                <option key={a.codigo_area} value={a.codigo_area}>
                  {'—'.repeat(a.nivel || 0)} {a.nombre} ({a.codigo_area})
                </option>
              ))}
            </select>
            <p className="text-xs text-texto-muted">Selecciona el área jerárquicamente superior</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-error">{error}</p></div>}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModalArea(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardarArea} cargando={guardando}>Crear área</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
