'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function PaginaRaiz() {
  const router = useRouter()
  const { usuario, cargando, error } = useAuth()

  useEffect(() => {
    if (cargando) return
    if (usuario) {
      router.replace(usuario.url_inicio || '/dashboard')
    } else if (!error) {
      // Sin sesión y sin error → ir a login
      router.replace('/login')
    }
    // Si hay error (backend no respondió), quedarse aquí y mostrar el estado de error
  }, [usuario, cargando, error, router])

  // Estado de error: backend no respondió después de todos los reintentos
  if (!cargando && error && !usuario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center flex flex-col gap-4">
          <div className="text-4xl">⚠️</div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">El servidor no está disponible</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Spinner de carga normal
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Iniciando sesión…</p>
    </div>
  )
}
