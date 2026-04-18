'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Boton } from '@/components/ui/boton'
import { BarraHerramientas } from '@/components/ui/barra-herramientas'
import {
  TablaCrud,
  columnaCodigo,
  columnaNombre,
  columnaDescripcion,
} from '@/components/ui/tabla-crud'
import { Insignia } from '@/components/ui/insignia'
import { tareasDatosBasicosApi } from '@/lib/api'
import type { CategoriaTarea } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
import { BotonChat } from '@/components/ui/boton-chat'

type FormCategoriaTarea = {
  codigo_categoria_tarea: string
  nombre_categoria_tarea: string
  descripcion_categoria_tarea: string
}

export default function PaginaCategoriasTarea() {
  const t = useTranslations('categoriasTarea')
  const tc = useTranslations('common')

  const crud = useCrudPage<CategoriaTarea, FormCategoriaTarea>({
    cargarFn: () => tareasDatosBasicosApi.listarCategorias(),
    crearFn: (f) =>
      tareasDatosBasicosApi.crearCategoria({
        codigo_categoria_tarea: f.codigo_categoria_tarea.trim() || undefined,
        nombre_categoria_tarea: f.nombre_categoria_tarea.trim(),
        descripcion_categoria_tarea: f.descripcion_categoria_tarea.trim() || undefined,
      }) as Promise<CategoriaTarea>,
    actualizarFn: (id, f) =>
      tareasDatosBasicosApi.actualizarCategoria(id, {
        nombre_categoria_tarea: f.nombre_categoria_tarea?.trim(),
        descripcion_categoria_tarea: f.descripcion_categoria_tarea?.trim() || undefined,
      }) as Promise<CategoriaTarea>,
    eliminarFn: async (id) => { await tareasDatosBasicosApi.eliminarCategoria(id) },
    getId: (c) => c.codigo_categoria_tarea,
    camposBusqueda: (c) => [c.codigo_categoria_tarea, c.nombre_categoria_tarea, c.descripcion_categoria_tarea ?? ''],
    formInicial: { codigo_categoria_tarea: '', nombre_categoria_tarea: '', descripcion_categoria_tarea: '' },
    itemToForm: (c) => ({
      codigo_categoria_tarea: c.codigo_categoria_tarea,
      nombre_categoria_tarea: c.nombre_categoria_tarea,
      descripcion_categoria_tarea: c.descripcion_categoria_tarea ?? '',
    }),
  })

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) =>
    a.nombre_categoria_tarea.localeCompare(b.nombre_categoria_tarea),
  )

  return (
    <div className="relative flex flex-col gap-6 max-w-5xl">
      <BotonChat className="top-0 right-0" />
      <div className="pr-28">
        <h2 className="page-heading">{t('titulo')}</h2>
        <p className="text-sm text-texto-muted mt-1">{t('subtitulo')}</p>
      </div>

      <BarraHerramientas
        busqueda={crud.busqueda}
        onBusqueda={crud.setBusqueda}
        placeholderBusqueda={t('buscarPlaceholder')}
        onNuevo={crud.abrirNuevo}
        textoNuevo={t('nuevaCategoria')}
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: t('colCodigo'), campo: 'codigo_categoria_tarea' },
          { titulo: t('colNombre'), campo: 'nombre_categoria_tarea' },
          { titulo: t('colDescripcion'), campo: 'descripcion_categoria_tarea' },
          { titulo: t('colEstado'), campo: 'activo' },
        ]}
        excelNombreArchivo="categorias-tarea"
      />

      <TablaCrud
        columnas={[
          columnaCodigo<CategoriaTarea>(t('colCodigo'), (c) => c.codigo_categoria_tarea),
          columnaNombre<CategoriaTarea>(t('colNombre'), (c) => c.nombre_categoria_tarea),
          columnaDescripcion<CategoriaTarea>(t('colDescripcion'), (c) => c.descripcion_categoria_tarea),
          {
            titulo: t('colEstado'),
            render: (c: CategoriaTarea) =>
              c.activo ? (
                <Insignia variante="exito">{tc('activo')}</Insignia>
              ) : (
                <Insignia variante="neutro">{tc('inactivo')}</Insignia>
              ),
          },
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(c) => c.codigo_categoria_tarea}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio={t('sinCategorias')}
      />

      {/* Modal crear/editar */}
      <Modal
        abierto={crud.modal}
        alCerrar={crud.cerrarModal}
        titulo={
          crud.editando
            ? t('editarTitulo', { nombre: crud.editando.nombre_categoria_tarea })
            : t('nuevoTitulo')
        }
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4 min-w-[400px]">
          <Input
            etiqueta={t('etiquetaCodigo')}
            value={crud.form.codigo_categoria_tarea}
            onChange={(e) => crud.updateForm('codigo_categoria_tarea', e.target.value)}
            placeholder={t('placeholderCodigo')}
            disabled={!!crud.editando}
            autoFocus={!crud.editando}
          />

          <Input
            etiqueta={t('etiquetaNombre')}
            value={crud.form.nombre_categoria_tarea}
            onChange={(e) => crud.updateForm('nombre_categoria_tarea', e.target.value)}
            placeholder={t('placeholderNombre')}
            autoFocus={!!crud.editando}
          />

          <Textarea
            etiqueta={t('etiquetaDescripcion')}
            value={crud.form.descripcion_categoria_tarea}
            onChange={(e) => crud.updateForm('descripcion_categoria_tarea', e.target.value)}
            placeholder={t('placeholderDescripcion')}
            rows={3}
          />

          {crud.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{crud.error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={crud.cerrarModal}>
              {tc('salir')}
            </Boton>
            <Boton
              variante="secundario"
              onClick={() => {
                if (!crud.form.nombre_categoria_tarea.trim()) {
                  crud.setError(t('errorNombreObligatorio'))
                  return
                }
                crud.guardar(undefined, undefined, { cerrar: true })
              }}
              cargando={crud.guardando}
            >
              {tc('grabarYSalir')}
            </Boton>
            <Boton
              variante="primario"
              onClick={() => {
                if (!crud.form.nombre_categoria_tarea.trim()) {
                  crud.setError(t('errorNombreObligatorio'))
                  return
                }
                crud.guardar(undefined, undefined, { cerrar: false })
              }}
              cargando={crud.guardando}
            >
              {crud.editando ? tc('grabar') : tc('crear')}
            </Boton>
          </div>
        </div>
      </Modal>

      <ModalConfirmar
        abierto={!!crud.confirmacion}
        alCerrar={() => crud.setConfirmacion(null)}
        alConfirmar={crud.ejecutarEliminacion}
        titulo={t('eliminarTitulo')}
        mensaje={
          crud.confirmacion
            ? t('eliminarConfirm', { nombre: crud.confirmacion.nombre_categoria_tarea })
            : ''
        }
        textoConfirmar={tc('eliminar')}
        variante="peligro"
        cargando={crud.eliminando}
      />
    </div>
  )
}
