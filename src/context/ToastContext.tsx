'use client'

/**
 * Sistema de notificaciones tipo toast.
 *
 * Uso desde una página:
 *
 *   const toast = useToast()
 *   toast.success('Guardado')
 *   toast.error('No se pudo guardar', err.message)
 *   toast.info('Cargando...')
 *
 * Reemplaza el patrón ad-hoc `setMensaje({ tipo, texto }) + setTimeout`.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

type Tipo = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  tipo: Tipo
  titulo: string
  detalle?: string
  durationMs: number
}

interface ToastContextValue {
  success: (titulo: string, detalle?: string) => void
  error: (titulo: string, detalle?: string) => void
  info: (titulo: string, detalle?: string) => void
  warning: (titulo: string, detalle?: string) => void
  /** Para casos donde se necesita controlar la duración. */
  show: (tipo: Tipo, titulo: string, detalle?: string, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURACION_DEFAULT: Record<Tipo, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 6000,
}

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const cerrar = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((tipo: Tipo, titulo: string, detalle?: string, durationMs?: number) => {
    const id = ++_id
    const t: Toast = {
      id,
      tipo,
      titulo,
      detalle,
      durationMs: durationMs ?? DURACION_DEFAULT[tipo],
    }
    setToasts((prev) => [...prev, t])
  }, [])

  const value: ToastContextValue = {
    success: (titulo, detalle) => show('success', titulo, detalle),
    error: (titulo, detalle) => show('error', titulo, detalle),
    info: (titulo, detalle) => show('info', titulo, detalle),
    warning: (titulo, detalle) => show('warning', titulo, detalle),
    show,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} alCerrar={() => cerrar(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, alCerrar }: { toast: Toast; alCerrar: () => void }) {
  useEffect(() => {
    const id = setTimeout(alCerrar, toast.durationMs)
    return () => clearTimeout(id)
  }, [toast.durationMs, alCerrar])

  const estilos: Record<Tipo, { contenedor: string; icono: ReactNode }> = {
    success: {
      contenedor: 'bg-green-50 border-green-200 text-green-900',
      icono: <CheckCircle size={18} className="text-exito" />,
    },
    error: {
      contenedor: 'bg-red-50 border-red-200 text-red-900',
      icono: <XCircle size={18} className="text-error" />,
    },
    info: {
      contenedor: 'bg-blue-50 border-blue-200 text-blue-900',
      icono: <Info size={18} className="text-primario" />,
    },
    warning: {
      contenedor: 'bg-amber-50 border-amber-200 text-amber-900',
      icono: <AlertTriangle size={18} className="text-advertencia" />,
    },
  }

  const e = estilos[toast.tipo]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md transition-all ${e.contenedor}`}
    >
      <div className="mt-0.5">{e.icono}</div>
      <div className="flex-1 text-sm">
        <p className="font-medium">{toast.titulo}</p>
        {toast.detalle && <p className="text-xs opacity-80 mt-0.5">{toast.detalle}</p>}
      </div>
      <button
        onClick={alCerrar}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>')
  }
  return ctx
}
