'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authApi } from '@/lib/api'
import type { UsuarioContexto } from '@/lib/tipos'

// Timeout de inactividad por defecto (60 minutos) — se sobreescribe con parámetro SESION/DURACION_MINUTOS
const DEFAULT_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000

interface AuthContextType {
  usuario: UsuarioContexto | null
  cargando: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  loginConGoogle: () => Promise<void>
  logout: () => Promise<void>
  cambiarEntidad: (codigoEntidad: string) => Promise<void>
  cambiarGrupo: (codigoGrupo: string) => Promise<void>
  tieneFuncion: (codigoFuncion: string) => boolean
  esAdmin: () => boolean
  esSuperAdmin: () => boolean
  entidadActiva: string | null
  grupoActivo: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioContexto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const cargarContexto = useCallback(async () => {
    try {
      const ctx = await authApi.yo()
      setUsuario(ctx)
      return ctx
    } catch {
      setUsuario(null)
      return null
    }
  }, [])

  // Escucha cambios de sesión de Supabase (login, logout, OAuth callback)
  useEffect(() => {
    let isMounted = true
    let initialLoadDone = false

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        initialLoadDone = true
        if (session) {
          const ctx = await cargarContexto()
          if (isMounted && ctx && event === 'SIGNED_IN') {
            router.push(ctx.url_inicio || '/dashboard')
          }
          // Si la sesión existe pero no pudimos cargar contexto, redirigir a login
          if (isMounted && !ctx) {
            router.push('/login')
          }
        } else {
          setUsuario(null)
          // Redirigir a login si no hay sesión (cubre SIGNED_OUT y TOKEN_REFRESHED fallido)
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            router.push('/login')
          }
        }
        if (isMounted) setCargando(false)
      }
    )

    // Carga inicial - solo si el listener no la manejó ya
    // Timeout de seguridad: si después de 10s sigue cargando, forzar fin de carga
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !initialLoadDone) {
        setCargando(false)
        router.push('/login')
      }
    }, 10000)

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted || initialLoadDone) return
      if (data.session) {
        await cargarContexto()
      } else {
        // No hay sesión activa — redirigir a login
        setUsuario(null)
        if (isMounted) {
          const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/auth/callback'
          if (!isLoginPage) {
            router.push('/login')
          }
        }
      }
      if (isMounted) setCargando(false)
    }).catch(() => {
      // Error al obtener sesión — terminar carga y redirigir
      if (isMounted) {
        setCargando(false)
        router.push('/login')
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      listener.subscription.unsubscribe()
    }
  }, [cargarContexto, router])

  // Timeout de inactividad: cierra sesión si no hay actividad
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!usuario) return

    const timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(() => {
        logout()
      }, timeoutMs)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  const login = async (email: string, password: string) => {
    setError(null)
    setCargando(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw new Error(err.message)
      // onAuthStateChange maneja la redirección
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión')
      setCargando(false)
      throw e
    }
  }

  const loginConGoogle = async () => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (err) {
      setError(err.message)
      throw new Error(err.message)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    router.push('/login')
  }

  const cambiarEntidad = async (codigoEntidad: string) => {
    try {
      const ctx = await authApi.cambiarEntidad(codigoEntidad)
      setUsuario(ctx)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar entidad')
      throw e
    }
  }

  const cambiarGrupo = async (codigoGrupo: string) => {
    try {
      const ctx = await authApi.cambiarGrupo(codigoGrupo)
      setUsuario(ctx)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar grupo')
      throw e
    }
  }

  const tieneFuncion = (codigoFuncion: string) =>
    usuario?.funciones?.includes(codigoFuncion) ?? false

  const esAdmin = () =>
    usuario?.roles?.includes('ADMIN') || usuario?.rol_principal === 'ADMIN' ? true : false

  const esSuperAdmin = () =>
    usuario?.grupos?.some((g) => g.codigo_grupo === 'ADMIN') ?? false

  const entidadActiva = usuario?.entidad_activa ?? null
  const grupoActivo = usuario?.grupo_activo ?? null

  return (
    <AuthContext.Provider
      value={{
        usuario, cargando, error, login, loginConGoogle, logout,
        cambiarEntidad, cambiarGrupo, tieneFuncion, esAdmin, esSuperAdmin,
        entidadActiva, grupoActivo,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
