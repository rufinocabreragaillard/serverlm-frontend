'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { BarraHerramientas } from '@/components/ui/barra-herramientas'
import { PieBotonesModal } from '@/components/ui/pie-botones-modal'
import { TablaCrud, columnaCodigo, columnaNombre, columnaDescripcion } from '@/components/ui/tabla-crud'
import { procesosDatosBasicosApi } from '@/lib/api'
import type { CategoriaProceso, TipoProceso } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
import { BotonChat } from '@/components/ui/boton-chat'
import { cn } from '@/lib/utils'

type FormTipo = {
  codigo_categoria_proceso: string
  codigo_tipo_proceso: string
  nombre_tipo_proceso: string
  descripcion_tipo_proceso: string
  alias: string
  prompt: string
  system_prompt: string
}

type TabModal = 'datos' | 'prompt' | 'system_prompt'

const FORM_INICIAL: FormTipo = {
  codigo_categoria_proceso: '',
  codigo_tipo_proceso: '',
  nombre_tipo_proceso: '',
  descripcion_tipo_proceso: '',
  alias: '',
  prompt: '',
  system_prompt: '',
}

export default function PaginaTiposProceso() {
  const [tabModal, setTabModal] = useState<TabModal>('datos')
  const [categorias, setCategorias] = useState<CategoriaProceso[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => {
    procesosDatosBasicosApi.listarCategorias().then(setCategorias).catch(() => {})
  }, [])

  const crud = useCrudPage<TipoProceso, FormTipo>({
    cargarFn: () =>
      procesosDatosBasicosApi.listarTipos(filtroCategoria || undefined) as Promise<TipoProceso[]>,
    crearFn: (f) =>
      procesosDatosBasicosApi.crearTipo({
        codigo_categoria_proceso: f.codigo_categoria_proceso,
        codigo_tipo_proceso: f.codigo_tipo_proceso.trim() || undefined,
        nombre_tipo_proceso: f.nombre_tipo_proceso.trim(),
        descripcion_tipo_proceso: f.descripcion_tipo_proceso.trim() || undefined,
        alias: f.alias.trim() || undefined,
        prompt: f.prompt.trim() || undefined,
        system_prompt: f.system_prompt.trim() || undefined,
      }) as Promise<TipoProceso>,
    actualizarFn: (id, f) => {
      const [categoria, tipo] = id.split('/')
      return procesosDatosBasicosApi.actualizarTipo(categoria, tipo, {
        nombre_tipo_proceso: f.nombre_tipo_proceso.trim(),
        descripcion_tipo_proceso: f.descripcion_tipo_proceso.trim() || undefined,
        alias: f.alias.trim() || undefined,
        prompt: f.prompt.trim() || undefined,
        system_prompt: f.system_prompt.trim() || undefined,
      }) as Promise<TipoProceso>
    },
    eliminarFn: async (id) => {
      const [categoria, tipo] = id.split('/')
      await procesosDatosBasicosApi.eliminarTipo(categoria, tipo)
    },
    getId: (t) => `${t.codigo_categoria_proceso}/${t.codigo_tipo_proceso}`,
    camposBusqueda: (t) => [t.codigo_tipo_proceso, t.nombre_tipo_proceso, t.descripcion_tipo_proceso ?? ''],
    formInicial: FORM_INICIAL,
    itemToForm: (t) => ({
      codigo_categoria_proceso: t.codigo_categoria_proceso,
      codigo_tipo_proceso: t.codigo_tipo_proceso,
      nombre_tipo_proceso: t.nombre_tipo_proceso,
      descripcion_tipo_proceso: t.descripcion_tipo_proceso ?? '',
      alias: t.alias ?? '',
      prompt: t.prompt ?? '',
      system_prompt: t.system_prompt ?? '',
    }),
  })

  useEffect(() => {
    if (crud.modal) setTabModal('datos')
  }, [crud.modal])

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) => {
    const catCmp = a.codigo_categoria_proceso.localeCompare(b.codigo_categoria_proceso)
    return catCmp !== 0 ? catCmp : a.nombre_tipo_proceso.localeCompare(b.nombre_tipo_proceso)
  })

  const tabs: { key: TabModal; label: string }[] = [
    { key: 'datos', label: 'Datos' },
    { key: 'prompt', label: 'Prompt' },
    { key: 'system_prompt', label: 'System Prompt' },
  ]

  return (
    <div className="relative flex flex-col gap-6 max-w-5xl">
      <BotonChat className="top-0 right-0" />
      <div className="pr-28">
        <h2 className="page-heading">Tipos de Proceso</h2>
        <p className="text-sm text-texto-muted mt-1">Catálogo global de tipos de proceso por categoría (solo super-admin)</p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={filtroCategoria}
          onChange={(e) => { setFiltroCategoria(e.target.value); crud.cargar() }}
          className="text-sm border border-borde rounded-lg px-3 py-2 bg-surface text-texto focus:outline-none focus:ring-1 focus:ring-primario"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.codigo_categoria_proceso} value={c.codigo_categoria_proceso}>
              {c.nombre_categoria_proceso}
            </option>
          ))}
        </select>
      </div>

      <BarraHerramientas
        busqueda={crud.busqueda}
        onBusqueda={crud.setBusqueda}
        placeholderBusqueda="Buscar tipo..."
        onNuevo={crud.abrirNuevo}
        textoNuevo="Nuevo Tipo"
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: 'Categoría', campo: 'codigo_categoria_proceso' },
          { titulo: 'Código', campo: 'codigo_tipo_proceso' },
          { titulo: 'Nombre', campo: 'nombre_tipo_proceso' },
          { titulo: 'Descripción', campo: 'descripcion_tipo_proceso' },
          { titulo: 'Alias', campo: 'alias' },
        ]}
        excelNombreArchivo="tipos-proceso"
      />

      <TablaCrud
        columnas={[
          {
            titulo: 'Categoría',
            render: (t: TipoProceso) => {
              const cat = categorias.find((c) => c.codigo_categoria_proceso === t.codigo_categoria_proceso)
              return <span className="text-xs text-texto-muted">{cat?.nombre_categoria_proceso ?? t.codigo_categoria_proceso}</span>
            },
          },
          columnaCodigo<TipoProceso>('Código', (t) => t.codigo_tipo_proceso),
          columnaNombre<TipoProceso>('Nombre', (t) => t.nombre_tipo_proceso),
          columnaDescripcion<TipoProceso>('Descripción', (t) => t.descripcion_tipo_proceso),
          {
            titulo: 'Alias',
            render: (t: TipoProceso) => t.alias ? (
              <span className="text-xs text-texto-muted">{t.alias}</span>
            ) : null,
          },
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(t) => `${t.codigo_categoria_proceso}/${t.codigo_tipo_proceso}`}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio="Sin tipos de proceso"
      />

      <Modal
        abierto={crud.modal}
        alCerrar={crud.cerrarModal}
        titulo={crud.editando ? `Editar: ${crud.editando.nombre_tipo_proceso}` : 'Nuevo Tipo de Proceso'}
        className="max-w-2xl"
      >
        <div className="flex border-b border-borde mb-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTabModal(key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                tabModal === key
                  ? 'border-primario text-primario'
                  : 'border-transparent text-texto-muted hover:text-texto',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 min-w-[500px]">
          {tabModal === 'datos' && (
            <>
              <div>
                <label className="text-sm font-medium text-texto block mb-1">
                  Categoría <span className="text-error">*</span>
                </label>
                <select
                  value={crud.form.codigo_categoria_proceso}
                  onChange={(e) => crud.updateForm('codigo_categoria_proceso', e.target.value)}
                  disabled={!!crud.editando}
                  className="w-full text-sm border border-borde rounded-lg px-3 py-2 bg-surface text-texto focus:outline-none focus:ring-1 focus:ring-primario disabled:opacity-60"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map((c) => (
                    <option key={c.codigo_categoria_proceso} value={c.codigo_categoria_proceso}>
                      {c.nombre_categoria_proceso}
                    </option>
                  ))}
                </select>
              </div>
              {!crud.editando && (
                <Input
                  etiqueta="Código"
                  value={crud.form.codigo_tipo_proceso}
                  onChange={(e) => crud.updateForm('codigo_tipo_proceso', e.target.value)}
                  placeholder="Se genera automáticamente"
                />
              )}
              <Input
                etiqueta="Nombre"
                value={crud.form.nombre_tipo_proceso}
                onChange={(e) => crud.updateForm('nombre_tipo_proceso', e.target.value)}
                placeholder="Nombre del tipo de proceso"
                autoFocus
              />
              <Input
                etiqueta="Alias"
                value={crud.form.alias}
                onChange={(e) => crud.updateForm('alias', e.target.value)}
                placeholder="Alias corto (opcional)"
              />
              <Textarea
                etiqueta="Descripción"
                value={crud.form.descripcion_tipo_proceso}
                onChange={(e) => crud.updateForm('descripcion_tipo_proceso', e.target.value)}
                placeholder="Descripción del tipo de proceso"
                rows={3}
              />
            </>
          )}
          {tabModal === 'prompt' && (
            <Textarea
              etiqueta="Prompt"
              value={crud.form.prompt}
              onChange={(e) => crud.updateForm('prompt', e.target.value)}
              placeholder="Prompt principal para el LLM..."
              rows={14}
            />
          )}
          {tabModal === 'system_prompt' && (
            <Textarea
              etiqueta="System Prompt"
              value={crud.form.system_prompt}
              onChange={(e) => crud.updateForm('system_prompt', e.target.value)}
              placeholder="Instrucciones de sistema para el LLM..."
              rows={14}
            />
          )}

          {crud.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{crud.error}</p>
            </div>
          )}

          <PieBotonesModal
            editando={!!crud.editando}
            onGuardar={() => {
              if (!crud.form.nombre_tipo_proceso.trim()) { crud.setError('El nombre es obligatorio'); setTabModal('datos'); return }
              if (!crud.editando && !crud.form.codigo_categoria_proceso) { crud.setError('La categoría es obligatoria'); setTabModal('datos'); return }
              crud.guardar(undefined, undefined, { cerrar: false })
            }}
            onGuardarYSalir={() => {
              if (!crud.form.nombre_tipo_proceso.trim()) { crud.setError('El nombre es obligatorio'); setTabModal('datos'); return }
              if (!crud.editando && !crud.form.codigo_categoria_proceso) { crud.setError('La categoría es obligatoria'); setTabModal('datos'); return }
              crud.guardar(undefined, undefined, { cerrar: true })
            }}
            onCerrar={crud.cerrarModal}
            cargando={crud.guardando}
          />
        </div>
      </Modal>

      <ModalConfirmar
        abierto={!!crud.confirmacion}
        alCerrar={() => crud.setConfirmacion(null)}
        alConfirmar={crud.ejecutarEliminacion}
        titulo="Eliminar Tipo de Proceso"
        mensaje={crud.confirmacion ? `¿Eliminar el tipo "${crud.confirmacion.nombre_tipo_proceso}"?` : ''}
        textoConfirmar="Eliminar"
        variante="peligro"
        cargando={crud.eliminando}
      />
    </div>
  )
}
