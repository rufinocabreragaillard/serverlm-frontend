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
import type { TipoCanonicoTarea } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
import { BotonChat } from '@/components/ui/boton-chat'

type FormTipoCanonico = {
  codigo_tipo_canonico: string
  nombre_tipo_canonico: string
  descripcion_tipo_canonico: string
}

export default function PaginaTiposCanonicosTarea() {
  const t = useTranslations('tiposCanonicosTarea')
  const tc = useTranslations('common')

  const crud = useCrudPage<TipoCanonicoTarea, FormTipoCanonico>({
    cargarFn: () => tareasDatosBasicosApi.listarTiposCanonicos(),
    crearFn: (f) =>
      tareasDatosBasicosApi.crearTipoCanonico({
        codigo_tipo_canonico: f.codigo_tipo_canonico.trim() || undefined,
        nombre_tipo_canonico: f.nombre_tipo_canonico.trim(),
        descripcion_tipo_canonico: f.descripcion_tipo_canonico.trim() || undefined,
      }) as Promise<TipoCanonicoTarea>,
    actualizarFn: (id, f) =>
      tareasDatosBasicosApi.actualizarTipoCanonico(id, {
        nombre_tipo_canonico: f.nombre_tipo_canonico?.trim(),
        descripcion_tipo_canonico: f.descripcion_tipo_canonico?.trim() || undefined,
      }) as Promise<TipoCanonicoTarea>,
    eliminarFn: async (id) => { await tareasDatosBasicosApi.eliminarTipoCanonico(id) },
    getId: (tipo) => tipo.codigo_tipo_canonico,
    camposBusqueda: (tipo) => [tipo.codigo_tipo_canonico, tipo.nombre_tipo_canonico, tipo.descripcion_tipo_canonico ?? ''],
    formInicial: { codigo_tipo_canonico: '', nombre_tipo_canonico: '', descripcion_tipo_canonico: '' },
    itemToForm: (tipo) => ({
      codigo_tipo_canonico: tipo.codigo_tipo_canonico,
      nombre_tipo_canonico: tipo.nombre_tipo_canonico,
      descripcion_tipo_canonico: tipo.descripcion_tipo_canonico ?? '',
    }),
  })

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) =>
    a.nombre_tipo_canonico.localeCompare(b.nombre_tipo_canonico),
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
        textoNuevo={t('nuevoTipo')}
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: t('colCodigo'), campo: 'codigo_tipo_canonico' },
          { titulo: t('colNombre'), campo: 'nombre_tipo_canonico' },
          { titulo: t('colDescripcion'), campo: 'descripcion_tipo_canonico' },
          { titulo: t('colEstado'), campo: 'activo' },
        ]}
        excelNombreArchivo="tipos-canonicos-tarea"
      />

      <TablaCrud
        columnas={[
          columnaCodigo<TipoCanonicoTarea>(t('colCodigo'), (tc) => tc.codigo_tipo_canonico),
          columnaNombre<TipoCanonicoTarea>(t('colNombre'), (tc) => tc.nombre_tipo_canonico),
          columnaDescripcion<TipoCanonicoTarea>(t('colDescripcion'), (tc) => tc.descripcion_tipo_canonico),
          {
            titulo: t('colEstado'),
            render: (tipo: TipoCanonicoTarea) =>
              tipo.activo ? (
                <Insignia variante="exito">{tc('activo')}</Insignia>
              ) : (
                <Insignia variante="neutro">{tc('inactivo')}</Insignia>
              ),
          },
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(tipo) => tipo.codigo_tipo_canonico}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio={t('sinTipos')}
      />

      {/* Modal crear/editar */}
      <Modal
        abierto={crud.modal}
        alCerrar={crud.cerrarModal}
        titulo={
          crud.editando
            ? t('editarTitulo', { nombre: crud.editando.nombre_tipo_canonico })
            : t('nuevoTitulo')
        }
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4 min-w-[400px]">
          <Input
            etiqueta={t('etiquetaCodigo')}
            value={crud.form.codigo_tipo_canonico}
            onChange={(e) => crud.updateForm('codigo_tipo_canonico', e.target.value)}
            placeholder={t('placeholderCodigo')}
            disabled={!!crud.editando}
            autoFocus={!crud.editando}
          />

          <Input
            etiqueta={t('etiquetaNombre')}
            value={crud.form.nombre_tipo_canonico}
            onChange={(e) => crud.updateForm('nombre_tipo_canonico', e.target.value)}
            placeholder={t('placeholderNombre')}
            autoFocus={!!crud.editando}
          />

          <Textarea
            etiqueta={t('etiquetaDescripcion')}
            value={crud.form.descripcion_tipo_canonico}
            onChange={(e) => crud.updateForm('descripcion_tipo_canonico', e.target.value)}
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
                if (!crud.form.nombre_tipo_canonico.trim()) {
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
                if (!crud.form.nombre_tipo_canonico.trim()) {
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
            ? t('eliminarConfirm', { nombre: crud.confirmacion.nombre_tipo_canonico })
            : ''
        }
        textoConfirmar={tc('eliminar')}
        variante="peligro"
        cargando={crud.eliminando}
      />
    </div>
  )
}
