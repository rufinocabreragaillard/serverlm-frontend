'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Boton } from '@/components/ui/boton'
import { BarraHerramientas } from '@/components/ui/barra-herramientas'
import { TablaCrud } from '@/components/ui/tabla-crud'
import { Insignia } from '@/components/ui/insignia'
import { tareasApi } from '@/lib/api'
import type { Tarea } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
import { BotonChat } from '@/components/ui/boton-chat'

const selectClass =
  'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-primario disabled:opacity-50'

const PRIORIDADES = [
  { valor: 'urgente', etiquetaEs: 'Urgente' },
  { valor: 'alto', etiquetaEs: 'Alto' },
  { valor: 'medio', etiquetaEs: 'Medio' },
  { valor: 'bajo', etiquetaEs: 'Bajo' },
]

const PRIORIDAD_VARIANTE: Record<string, 'error' | 'advertencia' | 'primario' | 'exito'> = {
  urgente: 'error',
  alto: 'advertencia',
  medio: 'primario',
  bajo: 'exito',
}

type FormTarea = {
  nombre_tarea: string
  descripcion_tarea: string
  prioridad: 'urgente' | 'alto' | 'medio' | 'bajo'
  fecha_esperada: string
}

export default function PaginaTareasMantenedor() {
  const t = useTranslations('tareas')
  const tc = useTranslations('common')

  const crud = useCrudPage<Tarea, FormTarea>({
    cargarFn: () => tareasApi.listarTareas(),
    crearFn: (f) =>
      tareasApi.crearTarea({
        nombre_tarea: f.nombre_tarea.trim(),
        descripcion_tarea: f.descripcion_tarea.trim() || undefined,
        prioridad: f.prioridad,
        fecha_esperada: f.fecha_esperada || undefined,
      }) as Promise<Tarea>,
    actualizarFn: (id, f) =>
      tareasApi.actualizarTarea(Number(id), {
        nombre_tarea: f.nombre_tarea?.trim(),
        descripcion_tarea: f.descripcion_tarea?.trim() || undefined,
        prioridad: f.prioridad,
        fecha_esperada: f.fecha_esperada || undefined,
      }) as Promise<Tarea>,
    eliminarFn: async (id) => { await tareasApi.eliminarTarea(Number(id)) },
    getId: (t) => String(t.id_tarea),
    camposBusqueda: (t) => [t.nombre_tarea, t.descripcion_tarea ?? '', t.codigo_categoria_tarea],
    formInicial: { nombre_tarea: '', descripcion_tarea: '', prioridad: 'medio', fecha_esperada: '' },
    itemToForm: (t) => ({
      nombre_tarea: t.nombre_tarea,
      descripcion_tarea: t.descripcion_tarea ?? '',
      prioridad: t.prioridad,
      fecha_esperada: t.fecha_esperada ? t.fecha_esperada.substring(0, 10) : '',
    }),
  })

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) =>
    a.nombre_tarea.localeCompare(b.nombre_tarea),
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
        textoNuevo={t('nuevaTarea')}
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: 'ID', campo: 'id_tarea' },
          { titulo: t('colNombre'), campo: 'nombre_tarea' },
          { titulo: t('colPrioridad'), campo: 'prioridad' },
          { titulo: t('colCategoria'), campo: 'codigo_categoria_tarea' },
          { titulo: t('colEstado'), campo: 'codigo_estado_tarea' },
          { titulo: t('colFechaEsperada'), campo: 'fecha_esperada' },
        ]}
        excelNombreArchivo="tareas"
      />

      <TablaCrud
        columnas={[
          {
            titulo: t('colNombre'),
            render: (tarea: Tarea) => (
              <span className="font-medium text-sm">{tarea.nombre_tarea}</span>
            ),
          },
          {
            titulo: t('colPrioridad'),
            render: (tarea: Tarea) => (
              <Insignia variante={PRIORIDAD_VARIANTE[tarea.prioridad] ?? 'neutro'}>
                {PRIORIDADES.find((p) => p.valor === tarea.prioridad)?.etiquetaEs ?? tarea.prioridad}
              </Insignia>
            ),
          },
          {
            titulo: t('colCategoria'),
            render: (tarea: Tarea) => (
              <span className="text-sm text-texto-muted">{tarea.codigo_categoria_tarea}</span>
            ),
          },
          {
            titulo: t('colEstado'),
            render: (tarea: Tarea) => (
              <span className="text-sm text-texto-muted">{tarea.codigo_estado_tarea}</span>
            ),
          },
          {
            titulo: t('colFechaEsperada'),
            render: (tarea: Tarea) =>
              tarea.fecha_esperada ? (
                <span className="text-sm text-texto-muted">
                  {new Date(tarea.fecha_esperada).toLocaleDateString('es-CL')}
                </span>
              ) : (
                <span className="text-texto-light">—</span>
              ),
          },
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(tarea) => String(tarea.id_tarea)}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio={t('sinTareas')}
      />

      {/* Modal crear/editar */}
      <Modal
        abierto={crud.modal}
        alCerrar={crud.cerrarModal}
        titulo={
          crud.editando
            ? t('editarTitulo', { nombre: crud.editando.nombre_tarea })
            : t('nuevoTitulo')
        }
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4 min-w-[400px]">
          <Input
            etiqueta={t('etiquetaNombre')}
            value={crud.form.nombre_tarea}
            onChange={(e) => crud.updateForm('nombre_tarea', e.target.value)}
            placeholder={t('placeholderNombre')}
            autoFocus
          />

          <Textarea
            etiqueta={t('etiquetaDescripcion')}
            value={crud.form.descripcion_tarea}
            onChange={(e) => crud.updateForm('descripcion_tarea', e.target.value)}
            placeholder={t('placeholderDescripcion')}
            rows={3}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-texto">{t('etiquetaPrioridad')}</label>
            <select
              className={selectClass}
              value={crud.form.prioridad}
              onChange={(e) =>
                crud.updateForm('prioridad', e.target.value as FormTarea['prioridad'])
              }
            >
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiquetaEs}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-texto">{t('etiquetaFechaEsperada')}</label>
            <input
              type="date"
              className={selectClass}
              value={crud.form.fecha_esperada}
              onChange={(e) => crud.updateForm('fecha_esperada', e.target.value)}
            />
          </div>

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
                if (!crud.form.nombre_tarea.trim()) {
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
                if (!crud.form.nombre_tarea.trim()) {
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
            ? t('eliminarConfirm', { nombre: crud.confirmacion.nombre_tarea })
            : ''
        }
        textoConfirmar={tc('eliminar')}
        variante="peligro"
        cargando={crud.eliminando}
      />
    </div>
  )
}
