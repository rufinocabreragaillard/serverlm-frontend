'use client'

/**
 * Hook que consolida el patrón "drag-drop reorder → API call → rollback en error".
 *
 * Antes (16+ páginas reimplementaban esto):
 *
 *   const reordenar = async (nuevas: Funcion[]) => {
 *     setFunciones(nuevas)  // optimista
 *     try {
 *       await funcionesApi.reordenar(nuevas.map((f) => ({ codigo_funcion: f.codigo_funcion, orden: f.orden ?? 0 })))
 *     } catch { cargar() }  // rollback
 *   }
 *
 * Después:
 *
 *   const reordenar = useSortableApi<Funcion>({
 *     items: funciones,
 *     setItems: setFunciones,
 *     idField: 'codigo_funcion',
 *     reordenar: (orden) => funcionesApi.reordenar(orden),
 *     onError: cargar,  // rollback recargando
 *   })
 *
 *   <SortableDndContext onReorder={(n) => reordenar(n)} ...>
 */

import { useCallback } from 'react'
import { useToast } from '@/context/ToastContext'

interface UseSortableApiOptions<T> {
  items: T[]
  setItems: (items: T[]) => void
  /** Nombre del campo que actúa como ID en el payload. */
  idField: keyof T
  /** Llama al API con `[{ [idField]: id, orden: N }, ...]`. */
  reordenar: (payload: Array<Record<string, unknown>>) => Promise<unknown>
  /** Callback ante error (típicamente recargar para revertir). */
  onError?: () => void
  /** Mensaje del toast de error. Default: 'No se pudo guardar el orden'. */
  mensajeError?: string
}

export function useSortableApi<T extends Record<string, unknown>>({
  items,
  setItems,
  idField,
  reordenar,
  onError,
  mensajeError = 'No se pudo guardar el orden',
}: UseSortableApiOptions<T>) {
  const toast = useToast()
  void items  // evitar warning de eslint cuando no se usa en cuerpo del hook

  return useCallback(
    async (nuevas: T[]) => {
      setItems(nuevas)
      const payload = nuevas.map((item, idx) => ({
        [idField as string]: item[idField],
        orden: idx + 1,
      }))
      try {
        await reordenar(payload)
      } catch (e) {
        toast.error(mensajeError, e instanceof Error ? e.message : undefined)
        onError?.()
      }
    },
    [setItems, idField, reordenar, onError, mensajeError, toast],
  )
}
