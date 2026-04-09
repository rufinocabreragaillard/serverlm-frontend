'use client'

import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Boton } from '@/components/ui/boton'
import { BarraHerramientas } from '@/components/ui/barra-herramientas'
import { TablaCrud, columnaCodigo, columnaNombre, columnaDescripcion, columnaEstado } from '@/components/ui/tabla-crud'
import { tiposDocumentoPersonaApi } from '@/lib/api'
import type { TipoDocumentoPersona } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'
import { useAuth } from '@/context/AuthContext'

export default function PaginaTiposDocumentoPersona() {
  const { grupoActivo } = useAuth()

  const crud = useCrudPage<TipoDocumentoPersona, { codigo_tipo_doc: string; nombre: string; descripcion: string }>({
    cargarFn: tiposDocumentoPersonaApi.listar,
    crearFn: (f) => tiposDocumentoPersonaApi.crear({
      ...(f.codigo_tipo_doc.trim() ? { codigo_tipo_doc: f.codigo_tipo_doc.toUpperCase() } : { codigo_tipo_doc: '' }),
      codigo_grupo: grupoActivo ?? undefined,
      nombre: f.nombre,
      descripcion: f.descripcion || undefined,
    }),
    actualizarFn: (id, f) => tiposDocumentoPersonaApi.actualizar(id, {
      nombre: f.nombre,
      descripcion: f.descripcion || undefined,
    }),
    eliminarFn: async (id: string) => { await tiposDocumentoPersonaApi.desactivar(id) },
    getId: (t) => t.codigo_tipo_doc,
    camposBusqueda: (t) => [t.codigo_tipo_doc, t.nombre],
    formInicial: { codigo_tipo_doc: '', nombre: '', descripcion: '' },
    itemToForm: (t) => ({ codigo_tipo_doc: t.codigo_tipo_doc, nombre: t.nombre, descripcion: t.descripcion || '' }),
  })

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Tipos de Documento de Persona</h2>
        <p className="text-sm text-texto-muted mt-1">Tipos de documento de identificación</p>
      </div>

      <BarraHerramientas
        busqueda={crud.busqueda}
        onBusqueda={crud.setBusqueda}
        placeholderBusqueda="Buscar por código o nombre..."
        onNuevo={crud.abrirNuevo}
        textoNuevo="Nuevo tipo"
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: 'Código', campo: 'codigo_tipo_doc' },
          { titulo: 'Nombre', campo: 'nombre' },
          { titulo: 'Descripción', campo: 'descripcion' },
          { titulo: 'Estado', campo: 'activo', formato: (v: unknown) => (v ? 'Activo' : 'Inactivo') },
        ]}
        excelNombreArchivo="tipos-documento-persona"
      />

      <TablaCrud
        columnas={[
          columnaNombre<TipoDocumentoPersona>('Nombre', (t) => t.nombre),
          columnaDescripcion<TipoDocumentoPersona>('Descripción', (t) => t.descripcion),
          columnaEstado<TipoDocumentoPersona>((t) => t.activo),
          columnaCodigo<TipoDocumentoPersona>('Código', (t) => t.codigo_tipo_doc),
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(t) => t.codigo_tipo_doc}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio="No se encontraron tipos de documento"
      />

      <Modal abierto={crud.modal} alCerrar={crud.cerrarModal} titulo={crud.editando ? `Editar tipo: ${crud.editando.nombre}` : 'Nuevo tipo de documento'}>
        <div className="flex flex-col gap-4">
          <Input
            etiqueta="Nombre *"
            value={crud.form.nombre}
            onChange={(e) => crud.updateForm('nombre', e.target.value)}
            placeholder="Nombre del tipo de documento"
          />
          <div>
            <label className="block text-sm font-medium text-texto mb-1.5">Descripción</label>
            <textarea
              className="w-full rounded-lg border border-borde bg-fondo-tarjeta px-3 py-2 text-sm text-texto placeholder:text-texto-muted focus:border-primario focus:ring-1 focus:ring-primario outline-none resize-y min-h-[60px]"
              value={crud.form.descripcion}
              onChange={(e) => crud.updateForm('descripcion', e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>
          {crud.editando && (
            <Input etiqueta="Código" value={crud.form.codigo_tipo_doc} disabled readOnly />
          )}
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
                if (!crud.form.nombre.trim()) {
                  crud.setError('El nombre es obligatorio')
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
        titulo="Desactivar tipo de documento"
        mensaje={crud.confirmacion ? `¿Desactivar "${crud.confirmacion.nombre}"?` : ''}
        textoConfirmar="Desactivar"
        cargando={crud.eliminando}
      />
    </div>
  )
}
