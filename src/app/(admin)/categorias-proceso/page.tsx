'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { BarraHerramientas } from '@/components/ui/barra-herramientas'
import { PieBotonesModal } from '@/components/ui/pie-botones-modal'
import { TablaCrud, columnaCodigo, columnaNombre, columnaDescripcion } from '@/components/ui/tabla-crud'
import { procesosDatosBasicosApi } from '@/lib/api'
import type { CategoriaProceso } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
import { BotonChat } from '@/components/ui/boton-chat'
import { cn } from '@/lib/utils'

type FormCategoria = {
  codigo_categoria_proceso: string
  nombre_categoria_proceso: string
  descripcion_categoria_proceso: string
  alias: string
  prompt: string
  system_prompt: string
}

type TabModal = 'datos' | 'prompt' | 'system_prompt'

const FORM_INICIAL: FormCategoria = {
  codigo_categoria_proceso: '',
  nombre_categoria_proceso: '',
  descripcion_categoria_proceso: '',
  alias: '',
  prompt: '',
  system_prompt: '',
}

export default function PaginaCategoriasProceso() {
  const [tabModal, setTabModal] = useState<TabModal>('datos')

  const crud = useCrudPage<CategoriaProceso, FormCategoria>({
    cargarFn: () => procesosDatosBasicosApi.listarCategorias() as Promise<CategoriaProceso[]>,
    crearFn: (f) =>
      procesosDatosBasicosApi.crearCategoria({
        codigo_categoria_proceso: f.codigo_categoria_proceso.trim() || undefined,
        nombre_categoria_proceso: f.nombre_categoria_proceso.trim(),
        descripcion_categoria_proceso: f.descripcion_categoria_proceso.trim() || undefined,
        alias: f.alias.trim() || undefined,
        prompt: f.prompt.trim() || undefined,
        system_prompt: f.system_prompt.trim() || undefined,
      }) as Promise<CategoriaProceso>,
    actualizarFn: (id, f) =>
      procesosDatosBasicosApi.actualizarCategoria(id, {
        nombre_categoria_proceso: f.nombre_categoria_proceso.trim(),
        descripcion_categoria_proceso: f.descripcion_categoria_proceso.trim() || undefined,
        alias: f.alias.trim() || undefined,
        prompt: f.prompt.trim() || undefined,
        system_prompt: f.system_prompt.trim() || undefined,
      }) as Promise<CategoriaProceso>,
    eliminarFn: async (id) => {
      await procesosDatosBasicosApi.eliminarCategoria(id)
    },
    getId: (c) => c.codigo_categoria_proceso,
    camposBusqueda: (c) => [c.codigo_categoria_proceso, c.nombre_categoria_proceso, c.descripcion_categoria_proceso ?? ''],
    formInicial: FORM_INICIAL,
    itemToForm: (c) => ({
      codigo_categoria_proceso: c.codigo_categoria_proceso,
      nombre_categoria_proceso: c.nombre_categoria_proceso,
      descripcion_categoria_proceso: c.descripcion_categoria_proceso ?? '',
      alias: c.alias ?? '',
      prompt: c.prompt ?? '',
      system_prompt: c.system_prompt ?? '',
    }),
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
        <h2 className="page-heading">Categorías de Proceso</h2>
        <p className="text-sm text-texto-muted mt-1">Catálogo global de categorías de proceso (solo super-admin)</p>
      </div>

      <BarraHerramientas
        busqueda={crud.busqueda}
        onBusqueda={crud.setBusqueda}
        placeholderBusqueda="Buscar categoría..."
        onNuevo={crud.abrirNuevo}
        textoNuevo="Nueva Categoría"
        excelDatos={crud.filtrados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: 'Código', campo: 'codigo_categoria_proceso' },
          { titulo: 'Nombre', campo: 'nombre_categoria_proceso' },
          { titulo: 'Descripción', campo: 'descripcion_categoria_proceso' },
          { titulo: 'Alias', campo: 'alias' },
        ]}
        excelNombreArchivo="categorias-proceso"
      />

      <TablaCrud
        columnas={[
          columnaCodigo<CategoriaProceso>('Código', (c) => c.codigo_categoria_proceso),
          columnaNombre<CategoriaProceso>('Nombre', (c) => c.nombre_categoria_proceso),
          columnaDescripcion<CategoriaProceso>('Descripción', (c) => c.descripcion_categoria_proceso),
          {
            titulo: 'Alias',
            render: (c: CategoriaProceso) => c.alias ? (
              <span className="text-xs text-texto-muted">{c.alias}</span>
            ) : null,
          },
        ]}
        items={crud.filtrados}
        cargando={crud.cargando}
        getId={(c) => c.codigo_categoria_proceso}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio="Sin categorías de proceso"
      />

      <Modal
        abierto={crud.modal}
        alCerrar={crud.cerrarModal}
        titulo={crud.editando ? `Editar: ${crud.editando.nombre_categoria_proceso}` : 'Nueva Categoría de Proceso'}
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
              {!crud.editando && (
                <Input
                  etiqueta="Código"
                  value={crud.form.codigo_categoria_proceso}
                  onChange={(e) => crud.updateForm('codigo_categoria_proceso', e.target.value)}
                  placeholder="Se genera automáticamente"
                />
              )}
              <Input
                etiqueta="Nombre"
                value={crud.form.nombre_categoria_proceso}
                onChange={(e) => crud.updateForm('nombre_categoria_proceso', e.target.value)}
                placeholder="Nombre de la categoría"
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
                value={crud.form.descripcion_categoria_proceso}
                onChange={(e) => crud.updateForm('descripcion_categoria_proceso', e.target.value)}
                placeholder="Descripción de la categoría"
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
              if (!crud.form.nombre_categoria_proceso.trim()) { crud.setError('El nombre es obligatorio'); setTabModal('datos'); return }
              crud.guardar(undefined, undefined, { cerrar: false })
            }}
            onGuardarYSalir={() => {
              if (!crud.form.nombre_categoria_proceso.trim()) { crud.setError('El nombre es obligatorio'); setTabModal('datos'); return }
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
        titulo="Eliminar Categoría de Proceso"
        mensaje={crud.confirmacion ? `¿Eliminar la categoría "${crud.confirmacion.nombre_categoria_proceso}"?` : ''}
        textoConfirmar="Eliminar"
        variante="peligro"
        cargando={crud.eliminando}
      />
    </div>
  )
}
