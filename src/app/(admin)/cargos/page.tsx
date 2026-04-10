'use client'

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
  columnaEstado,
} from '@/components/ui/tabla-crud'
import { cargosApi } from '@/lib/api'
import type { Cargo } from '@/lib/tipos'
import { useCrudPage } from '@/hooks/useCrudPage'

type FormCargo = {
  codigo_cargo: string
  nombre_cargo: string
  alias: string
  descripcion: string
}

export default function PaginaCargos() {
  const crud = useCrudPage<Cargo, FormCargo>({
    cargarFn: () => cargosApi.listar(),
    crearFn: (f) =>
      cargosApi.crear({
        codigo_cargo: f.codigo_cargo.trim() || undefined,
        nombre_cargo: f.nombre_cargo.trim(),
        alias: f.alias.trim() || undefined,
        descripcion: f.descripcion.trim() || undefined,
      }),
    actualizarFn: (id, f) =>
      cargosApi.actualizar(Number(id), {
        nombre_cargo: (f.nombre_cargo ?? '').trim(),
        alias: (f.alias ?? '').trim() || undefined,
        descripcion: (f.descripcion ?? '').trim() || undefined,
      }),
    eliminarFn: async (id: string) => {
      await cargosApi.eliminar(Number(id))
    },
    getId: (c) => String(c.id_cargo),
    camposBusqueda: (c) => [c.codigo_cargo, c.nombre_cargo, c.alias],
    formInicial: { codigo_cargo: '', nombre_cargo: '', alias: '', descripcion: '' },
    itemToForm: (c) => ({
      codigo_cargo: c.codigo_cargo,
      nombre_cargo: c.nombre_cargo,
      alias: c.alias ?? '',
      descripcion: c.descripcion ?? '',
    }),
  })

  const filtradosOrdenados = [...crud.filtrados].sort((a, b) =>
    a.nombre_cargo.localeCompare(b.nombre_cargo)
  )

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Cargos</h2>
        <p className="text-sm text-texto-muted mt-1">
          Cargos organizacionales del grupo activo
        </p>
      </div>

      <BarraHerramientas
        busqueda={crud.busqueda}
        onBusqueda={crud.setBusqueda}
        placeholderBusqueda="Buscar por código, nombre o alias..."
        onNuevo={crud.abrirNuevo}
        textoNuevo="Nuevo cargo"
        excelDatos={filtradosOrdenados as unknown as Record<string, unknown>[]}
        excelColumnas={[
          { titulo: 'Código', campo: 'codigo_cargo' },
          { titulo: 'Nombre', campo: 'nombre_cargo' },
          { titulo: 'Alias', campo: 'alias' },
          { titulo: 'Descripción', campo: 'descripcion' },
          { titulo: 'Estado', campo: 'activo', formato: (v: unknown) => (v ? 'Activo' : 'Inactivo') },
        ]}
        excelNombreArchivo="cargos"
      />

      <TablaCrud
        columnas={[
          columnaNombre<Cargo>('Nombre', (c) => c.nombre_cargo),
          { titulo: 'Alias', render: (c: Cargo) => c.alias || '—' },
          columnaDescripcion<Cargo>('Descripción', (c) => c.descripcion),
          columnaEstado<Cargo>((c) => c.activo),
          columnaCodigo<Cargo>('Código', (c) => c.codigo_cargo),
        ]}
        items={filtradosOrdenados}
        cargando={crud.cargando}
        getId={(c) => String(c.id_cargo)}
        onEditar={crud.abrirEditar}
        onEliminar={crud.setConfirmacion}
        textoVacio="No se encontraron cargos"
      />

      <Modal
        abierto={crud.modal}
        alCerrar={crud.cerrarModal}
        titulo={crud.editando ? `Cargo: ${crud.editando.nombre_cargo}` : 'Nuevo cargo'}
      >
        <div className="flex flex-col gap-4 min-w-[420px]">
          {/* Código: oculto al crear, disabled al editar */}
          {crud.editando && (
            <Input
              etiqueta="Código"
              value={crud.form.codigo_cargo}
              onChange={() => {}}
              disabled
            />
          )}
          <Input
            etiqueta="Nombre *"
            value={crud.form.nombre_cargo}
            onChange={(e) => crud.updateForm('nombre_cargo', e.target.value)}
            placeholder="Ej: Alcalde, Director de Finanzas"
            autoFocus
          />
          <Input
            etiqueta="Alias"
            value={crud.form.alias}
            onChange={(e) => crud.updateForm('alias', e.target.value)}
            placeholder="Nombre corto (se autogenera del nombre si se deja vacío)"
          />
          <Textarea
            etiqueta="Descripción"
            value={crud.form.descripcion}
            onChange={(e) => crud.updateForm('descripcion', e.target.value)}
            placeholder="Descripción opcional del cargo"
            rows={3}
          />

          {crud.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{crud.error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={crud.cerrarModal}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              onClick={() => {
                if (!crud.form.nombre_cargo.trim()) {
                  crud.setError('El nombre del cargo es obligatorio')
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
        titulo="Eliminar cargo"
        mensaje={
          crud.confirmacion
            ? `¿Eliminar el cargo "${crud.confirmacion.nombre_cargo}"? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        variante="peligro"
        cargando={crud.eliminando}
      />
    </div>
  )
}
