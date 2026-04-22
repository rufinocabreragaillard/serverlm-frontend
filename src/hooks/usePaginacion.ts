'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface RespuestaPaginada<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

interface Opciones<T, F> {
  /** Función que consume los filtros y retorna la respuesta paginada del backend. */
  fetcher: (params: { page: number; limit: number } & F) => Promise<RespuestaPaginada<T>>
  /** Filtros iniciales (además de page/limit). Cambios en este objeto resetean a página 1. */
  filtros: F
  /** Tamaño inicial de página (default 50). */
  limitInicial?: number
  /** Debounce en ms para refetch cuando cambian filtros (default 300). */
  debounceMs?: number
}

/**
 * Hook genérico para listados paginados servidor-side.
 *
 * - Dispara el fetcher al montar y cada vez que cambien `filtros`, `page` o `limit`.
 * - Aplica debounce a los cambios de filtros (útil para campos de búsqueda).
 * - Resetea a página 1 al cambiar filtros.
 * - `refetch()` re-ejecuta con los valores actuales (para después de crear/editar/eliminar).
 */
export function usePaginacion<T, F extends Record<string, unknown>>({
  fetcher,
  filtros,
  limitInicial = 50,
  debounceMs = 300,
}: Opciones<T, F>) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(limitInicial)
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Serializamos filtros para comparar por valor (evita ref re-renders).
  const filtrosKey = JSON.stringify(filtros)
  const filtrosKeyPrev = useRef(filtrosKey)
  // Ref siempre actualizada para que los callbacks capturen los filtros más recientes.
  const filtrosRef = useRef(filtros)
  filtrosRef.current = filtros

  const ejecutar = useCallback(async (p: number, l: number, f: F) => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetcher({ page: p, limit: l, ...f })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
      setItems([])
      setTotal(0)
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher])

  useEffect(() => {
    const filtrosChanged = filtrosKey !== filtrosKeyPrev.current
    if (filtrosChanged) {
      filtrosKeyPrev.current = filtrosKey
      if (page !== 1) {
        setPage(1)
        return   // el cambio de page dispara otro efecto
      }
    }
    // Debounce solo para cambios de filtros (ej. búsqueda mientras escribe).
    // Cambios de página/limit son inmediatos para evitar el reset accidental a página 1.
    const delay = filtrosChanged ? debounceMs : 0
    const t = setTimeout(() => ejecutar(page, limit, filtrosRef.current), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey, page, limit, ejecutar])

  const refetch = useCallback(() => ejecutar(page, limit, filtrosRef.current), [ejecutar, page, limit])

  return {
    items, total, page, limit, cargando, error,
    setPage, setLimit, refetch,
  }
}
