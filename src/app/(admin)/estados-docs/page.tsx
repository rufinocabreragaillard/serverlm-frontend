'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Boton } from '@/components/ui/boton'
import { BarraHerramientas } from '@/components/ui/barra-herramientas'
import { TablaCrud, columnaCodigo, columnaNombre, columnaDescripcion, columnaEstado } from '@/components/ui/tabla-crud'
import { estadosDocsApi } from '@/lib/api'
import type { EstadoDoc } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
export default function PaginaEstadosDocs() {
  const crud = useCrudPage<EstadoDoc, { codigo_estado_doc: string; nombre_estado: string; descripcion: string }>({
    cargarFn: estadosDocsApi.listar,
    crearFn: (f) => estadosDocsApi.crear({
      codigo_estado_doc: f.codigo_estado_doc.toUpperCase().replace(/\s+/g, '_'),
      nombre_estado: f.nombre_estado,
      descripcion: f.descripcion || undefined,
    }),
    actualizarFn: (id, f) => estadosDocsApi.actualizar(id, {
      nombre_estado: f.nombre_estado,
      descripcion: f.descripcion || undefined,
    }),
    eliminarFn: async (id: string) => { await estadosDocsApi.desactivar(id) },
    getId: (e) => e.codigo_estado_doc,
    camposBusqueda: (e) => [e.codigo_estado_doc, e.nombre_estado],
    formInicial: { codigo_estado_doc: '', nombre_estado: '', descripcion: '' },
    itemToForm: (e) => ({ codigo_estado_doc: e.codigo_estado_doc, nombre_estado: e.nombre_estado, descripcion: e.descripcion || '' }),
  })

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) => a.orden - b.orden || a.nombre_estado.localeCompare(b.nombre_estado))

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Estados de Documentos</h2>
        <p className="text-sm text-texto-muted mt-1">Estados globales para los documentos del sistema</p>
      </div>

      <BarraHerramientas
        busqueda={crud.busqueda}
        onBusqueda={crud.setBusqueda}
        placeholderBusqueda="Buscar por código o nombre..."
        onNuevo={crud.abrirNuevo}
        textoNuevo="Nuevo estado"
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: 'Código', campo: 'codigo_estado_doc' },
          { titulo: 'Nombre', campo: 'nombre_estado' },
          { titulo: 'Descripción', campo: 'descripcion' },
          { titulo: 'Estado', campo: 'activo', formato: (v: unknown) => (v ? 'Activo' : 'Inactivo') },
        ]}
        excelNombreArchivo="estados-docs"
      />

      <TablaCrud
        columnas={[
          columnaCodigo<EstadoDoc>('Código', (e) => e.codigo_estado_doc),
          columnaNombre<EstadoDoc>('Nombre', (e) => e.nombre_estado),
          columnaDescripcion<EstadoDoc>('Descripción', (e) => e.descripcion),
          columnaEstado<EstadoDoc>((e) => e.activo),
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(e) => e.codigo_estado_doc}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio="No se encontraron estados"
      />

      <Modal abierto={crud.modal} alCerrar={crud.cerrarModal} titulo={crud.editando ? `Estado: ${crud.editando.nombre_estado}` : 'Nuevo estado de documento'}>
        <div className="flex flex-col gap-4 min-w-[400px]">
          <Input
            etiqueta="Código *"
            value={crud.form.codigo_estado_doc}
            onChange={(e) => crud.updateForm('codigo_estado_doc', e.target.value)}
            placeholder="BORRADOR, EN_REVISION, APROBADO"
            disabled={!!crud.editando}
          />
          <Input
            etiqueta="Nombre *"
            value={crud.form.nombre_estado}
            onChange={(e) => crud.updateForm('nombre_estado', e.target.value)}
            placeholder="Nombre del estado"
          />
          <Textarea
            etiqueta="Descripción"
            value={crud.form.descripcion}
            onChange={(e) => crud.updateForm('descripcion', e.target.value)}
            placeholder="Descripción opcional"
            rows={3}
          />
          {crud.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{crud.error}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={crud.cerrarModal}>Cancelar</Boton>
            <Boton
              variante="primario"
              onClick={() => {
                if (!crud.form.codigo_estado_doc.trim() || !crud.form.nombre_estado.trim()) {
                  crud.setError('Código y nombre son obligatorios')
                  return
                }
                crud.guardar()
              }}
              cargando={crud.guardando}
            >
              {crud.editando ? 'Guardar' : 'Crear'}
            </Boton>
          </div>
        </div>
      </Modal>

      <ModalConfirmar
        abierto={!!crud.confirmacion}
        alCerrar={() => crud.setConfirmacion(null)}
        alConfirmar={crud.ejecutarEliminacion}
        titulo="Desactivar estado"
        mensaje={crud.confirmacion ? `¿Desactivar el estado "${crud.confirmacion.nombre_estado}"?` : ''}
        textoConfirmar="Desactivar"
        cargando={crud.eliminando}
      />
    </div>
  )
}
