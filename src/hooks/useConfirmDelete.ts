'use client'

/**
 * Hook que consolida el patrón "modal de confirmación → DELETE → recargar".
 *
 * Antes (38+ páginas reimplementaban esto):
 *
 *   const [aEliminar, setAEliminar] = useState<T | null>(null)
 *   const [eliminando, setEliminando] = useState(false)
 *   const ejecutar = async () => {
 *     if (!aEliminar) return
 *     setEliminando(true)
 *     try { await api.eliminar(aEliminar.id); recargar(); setAEliminar(null) }
 *     catch (e) { setError(...) }
 *     finally { setEliminando(false) }
 *   }
 *
 * Después:
 *
 *   const del = useConfirmDelete<Funcion>({
 *     eliminar: (f) => funcionesApi.eliminar(f.codigo_funcion),
 *     onExito: () => cargar(),
 *     mensajeExito: 'Función eliminada',
 *   })
 *
 *   <Boton onClick={() => del.pedirConfirmacion(item)}>...</Boton>
 *   <ModalConfirmar
 *     abierto={!!del.candidato}
 *     alCerrar={del.cancelar}
 *     alConfirmar={del.confirmar}
 *     titulo="Eliminar"
 *     mensaje={del.candidato ? `¿Eliminar "${del.candidato.nombre}"?` : ''}
 *     cargando={del.cargando}
 *   />
 */

import { useCallback, useState } from 'react'
import { useToast } from '@/context/ToastContext'

interface UseConfirmDeleteOptions<T> {
  /** Función que realiza el DELETE en el backend. */
  eliminar: (item: T) => Promise<unknown>
  /** Callback al éxito (típicamente recargar la lista). */
  onExito?: () => void
  /** Mensaje del toast de éxito. Default: 'Eliminado'. */
  mensajeExito?: string
  /** Mensaje base del toast de error. Default: 'No se pudo eliminar'. */
  mensajeError?: string
}

export function useConfirmDelete<T>({
  eliminar,
  onExito,
  mensajeExito = 'Eliminado',
  mensajeError = 'No se pudo eliminar',
}: UseConfirmDeleteOptions<T>) {
  const toast = useToast()
  const [candidato, setCandidato] = useState<T | null>(null)
  const [cargando, setCargando] = useState(false)

  const pedirConfirmacion = useCallback((item: T) => {
    setCandidato(item)
  }, [])

  const cancelar = useCallback(() => {
    if (cargando) return
    setCandidato(null)
  }, [cargando])

  const confirmar = useCallback(async () => {
    if (!candidato) return
    setCargando(true)
    try {
      await eliminar(candidato)
      toast.success(mensajeExito)
      setCandidato(null)
      onExito?.()
    } catch (e) {
      toast.error(mensajeError, e instanceof Error ? e.message : undefined)
    } finally {
      setCargando(false)
    }
  }, [candidato, eliminar, onExito, mensajeExito, mensajeError, toast])

  return { candidato, cargando, pedirConfirmacion, cancelar, confirmar }
}
