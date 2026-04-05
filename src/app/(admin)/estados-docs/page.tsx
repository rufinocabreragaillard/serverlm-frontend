'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Download, Search } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Insignia } from '@/components/ui/insignia'
import { Modal } from '@/components/ui/modal'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Tabla, TablaCabecera, TablaCuerpo, TablaFila, TablaTh, TablaTd } from '@/components/ui/tabla'
import { estadosDocsApi } from '@/lib/api'
import type { EstadoDoc } from '@/lib/tipos'
import { exportarExcel } from '@/lib/exportar-excel'
import { useAuth } from '@/context/AuthContext'

export default function PaginaEstadosDocs() {
  const { grupoActivo } = useAuth()

  const [estados, setEstados] = useState<EstadoDoc[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<EstadoDoc | null>(null)
  const [form, setForm] = useState({ codigo_estado: '', nombre_estado: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [confirmacion, setConfirmacion] = useState<EstadoDoc | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setEstados(await estadosDocsApi.listar())
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ codigo_estado: '', nombre_estado: '', descripcion: '' })
    setError('')
    setModal(true)
  }

  const abrirEditar = (e: EstadoDoc) => {
    setEditando(e)
    setForm({
      codigo_estado: e.codigo_estado,
      nombre_estado: e.nombre_estado,
      descripcion: e.descripcion || '',
    })
    setError('')
    setModal(true)
  }

  const guardar = async () => {
    if (!form.codigo_estado.trim() || !form.nombre_estado.trim()) {
      setError('Código y nombre son obligatorios')
      return
    }
    setGuardando(true)
    try {
      if (editando) {
        await estadosDocsApi.actualizar(editando.codigo_estado, {
          nombre_estado: form.nombre_estado,
          descripcion: form.descripcion || undefined,
        })
      } else {
        await estadosDocsApi.crear({
          codigo_estado: form.codigo_estado.toUpperCase().replace(/\s+/g, '_'),
          codigo_grupo: grupoActivo!,
          nombre_estado: form.nombre_estado,
          descripcion: form.descripcion || undefined,
        })
      }
      setModal(false)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const ejecutarEliminacion = async () => {
    if (!confirmacion) return
    setEliminando(true)
    try {
      await estadosDocsApi.desactivar(confirmacion.codigo_estado)
      setConfirmacion(null)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar')
      setConfirmacion(null)
    } finally {
      setEliminando(false)
    }
  }

  const filtrados = estados
    .filter(
      (e) =>
        e.codigo_estado.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.nombre_estado.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => a.orden - b.orden || a.nombre_estado.localeCompare(b.nombre_estado))

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Estados de Documentos</h2>
        <p className="text-sm text-texto-muted mt-1">Estados posibles para los documentos del grupo</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Buscar por código o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icono={<Search size={15} />}
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Boton
            variante="contorno"
            tamano="sm"
            onClick={() =>
              exportarExcel(
                filtrados as unknown as Record<string, unknown>[],
                [
                  { titulo: 'Código', campo: 'codigo_estado' },
                  { titulo: 'Nombre', campo: 'nombre_estado' },
                  { titulo: 'Descripción', campo: 'descripcion' },
                  { titulo: 'Estado', campo: 'activo', formato: (v: unknown) => (v ? 'Activo' : 'Inactivo') },
                ],
                'estados-docs'
              )
            }
            disabled={filtrados.length === 0}
          >
            <Download size={15} />
            Excel
          </Boton>
          <Boton variante="primario" onClick={abrirNuevo}>
            <Plus size={16} />
            Nuevo estado
          </Boton>
        </div>
      </div>

      <Tabla>
        <TablaCabecera>
          <tr>
            <TablaTh>Código</TablaTh>
            <TablaTh>Nombre</TablaTh>
            <TablaTh>Descripción</TablaTh>
            <TablaTh>Estado</TablaTh>
            <TablaTh className="text-right">Acciones</TablaTh>
          </tr>
        </TablaCabecera>
        <TablaCuerpo>
          {cargando ? (
            <TablaFila>
              <TablaTd className="py-8 text-center text-texto-muted" colSpan={5 as never}>
                Cargando...
              </TablaTd>
            </TablaFila>
          ) : filtrados.length === 0 ? (
            <TablaFila>
              <TablaTd className="py-8 text-center text-texto-muted" colSpan={5 as never}>
                No se encontraron estados
              </TablaTd>
            </TablaFila>
          ) : (
            filtrados.map((e) => (
              <TablaFila key={e.codigo_estado}>
                <TablaTd>
                  <code className="text-xs bg-fondo px-2 py-1 rounded font-mono">{e.codigo_estado}</code>
                </TablaTd>
                <TablaTd className="font-medium">{e.nombre_estado}</TablaTd>
                <TablaTd className="text-texto-muted text-sm max-w-[300px] truncate">
                  {e.descripcion || '—'}
                </TablaTd>
                <TablaTd>
                  <Insignia variante={e.activo ? 'exito' : 'error'}>
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </Insignia>
                </TablaTd>
                <TablaTd>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(e)} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmacion(e)} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors" title="Desactivar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TablaTd>
              </TablaFila>
            ))
          )}
        </TablaCuerpo>
      </Tabla>

      <Modal abierto={modal} alCerrar={() => setModal(false)} titulo={editando ? `Estado: ${editando.nombre_estado}` : 'Nuevo estado de documento'}>
        <div className="flex flex-col gap-4 min-w-[400px]">
          <Input
            etiqueta="Código *"
            value={form.codigo_estado}
            onChange={(e) => setForm({ ...form, codigo_estado: e.target.value })}
            placeholder="BORRADOR, EN_REVISION, APROBADO"
            disabled={!!editando}
          />
          <Input
            etiqueta="Nombre *"
            value={form.nombre_estado}
            onChange={(e) => setForm({ ...form, nombre_estado: e.target.value })}
            placeholder="Nombre del estado"
          />
          <Textarea
            etiqueta="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Descripción opcional"
            rows={3}
          />
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Boton variante="contorno" onClick={() => setModal(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardar} cargando={guardando}>
              {editando ? 'Guardar' : 'Crear'}
            </Boton>
          </div>
        </div>
      </Modal>

      <ModalConfirmar
        abierto={!!confirmacion}
        alCerrar={() => setConfirmacion(null)}
        alConfirmar={ejecutarEliminacion}
        titulo="Desactivar estado"
        mensaje={confirmacion ? `¿Desactivar el estado "${confirmacion.nombre_estado}"?` : ''}
        textoConfirmar="Desactivar"
        cargando={eliminando}
      />
    </div>
  )
}
