'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { Boton } from '@/components/ui/boton'
import { ModalConfirmar } from '@/components/ui/modal-confirmar'
import { Tarjeta, TarjetaCabecera, TarjetaTitulo, TarjetaDescripcion, TarjetaContenido } from '@/components/ui/tarjeta'
import { useAuth } from '@/context/AuthContext'
import { parametrosApi, datosBasicosApi } from '@/lib/api'
import type { CategoriaParametro, TipoParametro, ParametroGeneral, ParametroUsuario } from '@/lib/tipos'

interface ParametroRow {
  categoria_parametro: string
  tipo_parametro: string
  valor_parametro: string
  descripcion?: string
}

export default function PaginaParametrosGenerales() {
  const { esAdmin } = useAuth()
  const [params, setParams] = useState<ParametroRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState('')
  const [error, setError] = useState('')

  // Categorías y tipos para agregar
  const [categorias, setCategorias] = useState<CategoriaParametro[]>([])
  const [tiposPorCat, setTiposPorCat] = useState<TipoParametro[]>([])
  const [nuevoParam, setNuevoParam] = useState({ categoria_parametro: '', tipo_parametro: '', valor_parametro: '' })

  const [paramAEliminar, setParamAEliminar] = useState<{ cat: string; tipo: string } | null>(null)

  const mostrarExito = (msg: string) => { setMensajeExito(msg); setError(''); setTimeout(() => setMensajeExito(''), 3000) }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await parametrosApi.listarGenerales()
      setParams(data.map((p: ParametroGeneral) => ({
        categoria_parametro: p.categoria_parametro,
        tipo_parametro: p.tipo_parametro,
        valor_parametro: p.valor_parametro,
        descripcion: p.descripcion,
      })))
    } catch { setParams([]) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { datosBasicosApi.listarCategorias().then(setCategorias).catch(() => {}) }, [])
  useEffect(() => {
    if (!nuevoParam.categoria_parametro) { setTiposPorCat([]); return }
    datosBasicosApi.listarTipos(nuevoParam.categoria_parametro).then(setTiposPorCat).catch(() => {})
  }, [nuevoParam.categoria_parametro])

  const guardarInline = async (cat: string, tipo: string, valor: string) => {
    setGuardando(`${cat}/${tipo}`); setError('')
    try {
      await parametrosApi.upsertGenerales({ categoria_parametro: cat, tipo_parametro: tipo, valor_parametro: valor })
      mostrarExito('Parámetro guardado')
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setGuardando(null) }
  }

  const eliminarParam = async () => {
    if (!paramAEliminar) return
    try {
      await parametrosApi.eliminarGeneral(paramAEliminar.cat, paramAEliminar.tipo)
      mostrarExito('Parámetro eliminado'); setParamAEliminar(null); cargar()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
  }

  const agregarNuevo = async () => {
    if (!nuevoParam.categoria_parametro || !nuevoParam.tipo_parametro || !nuevoParam.valor_parametro) { setError('Todos los campos son obligatorios'); return }
    await guardarInline(nuevoParam.categoria_parametro, nuevoParam.tipo_parametro, nuevoParam.valor_parametro)
    setNuevoParam({ categoria_parametro: '', tipo_parametro: '', valor_parametro: '' }); cargar()
  }

  const tiposDisponibles = tiposPorCat.filter((t) => !params.some((p) => p.categoria_parametro === t.categoria_parametro && p.tipo_parametro === t.tipo_parametro))
  const selectClass = 'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto focus:outline-none focus:ring-1 focus:ring-primario disabled:opacity-50'

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-texto">Parámetros Generales</h2>
        <p className="text-sm text-texto-muted mt-1">Parámetros que afectan a todos los usuarios del sistema</p>
      </div>

      {mensajeExito && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3"><p className="text-sm text-exito">{mensajeExito}</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-error">{error}</p></div>}

      <Tarjeta>
        <TarjetaCabecera>
          <TarjetaTitulo>Generales</TarjetaTitulo>
          <TarjetaDescripcion>Valores globales del sistema</TarjetaDescripcion>
        </TarjetaCabecera>
        <TarjetaContenido>
          {cargando ? (
            <div className="flex flex-col gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-fondo rounded-lg animate-pulse" />)}</div>
          ) : params.length === 0 ? (
            <p className="text-sm text-texto-muted text-center py-4">No hay parámetros configurados</p>
          ) : (
            <div className="flex flex-col gap-3">
              {params.map((p) => {
                const key = `${p.categoria_parametro}/${p.tipo_parametro}`
                return (
                  <div key={key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-borde bg-surface">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-texto-muted mb-1">{p.categoria_parametro}<span className="mx-1 text-texto-light">/</span>{p.tipo_parametro}</p>
                      <input type="text" defaultValue={p.valor_parametro} onBlur={(e) => { if (e.target.value !== p.valor_parametro) guardarInline(p.categoria_parametro, p.tipo_parametro, e.target.value) }} className="w-full text-sm text-texto bg-transparent border-b border-transparent hover:border-borde focus:border-primario focus:outline-none py-0.5" />
                    </div>
                    <button onClick={(e) => { const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement); if (input) guardarInline(p.categoria_parametro, p.tipo_parametro, input.value) }} disabled={guardando === key} className="p-1.5 rounded-lg hover:bg-primario-muy-claro text-texto-muted hover:text-primario transition-colors shrink-0" title="Guardar"><Save size={14} /></button>
                    <button onClick={() => setParamAEliminar({ cat: p.categoria_parametro, tipo: p.tipo_parametro })} className="p-1.5 rounded-lg hover:bg-red-50 text-texto-muted hover:text-error transition-colors shrink-0" title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}

          {esAdmin() && (
            <div className="border-t border-borde mt-4 pt-4">
              <p className="text-xs font-semibold text-texto-muted uppercase tracking-wider mb-3">Agregar parámetro</p>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <select value={nuevoParam.categoria_parametro} onChange={(e) => setNuevoParam({ categoria_parametro: e.target.value, tipo_parametro: '', valor_parametro: nuevoParam.valor_parametro })} className={selectClass}>
                    <option value="">Categoría...</option>
                    {categorias.filter((c) => c.activo).map((c) => <option key={c.categoria_parametro} value={c.categoria_parametro}>{c.nombre}</option>)}
                  </select>
                  <select value={nuevoParam.tipo_parametro} onChange={(e) => setNuevoParam({ ...nuevoParam, tipo_parametro: e.target.value })} className={selectClass} disabled={!nuevoParam.categoria_parametro}>
                    <option value="">Tipo...</option>
                    {tiposDisponibles.map((t) => <option key={t.tipo_parametro} value={t.tipo_parametro}>{t.nombre}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Valor del parámetro" value={nuevoParam.valor_parametro} onChange={(e) => setNuevoParam({ ...nuevoParam, valor_parametro: e.target.value })} className={`flex-1 ${selectClass}`} />
                  <Boton variante="primario" tamano="sm" onClick={agregarNuevo}>Agregar</Boton>
                </div>
              </div>
            </div>
          )}
        </TarjetaContenido>
      </Tarjeta>

      <ModalConfirmar abierto={!!paramAEliminar} alCerrar={() => setParamAEliminar(null)} alConfirmar={eliminarParam} titulo="Eliminar parámetro" mensaje={`¿Eliminar el parámetro ${paramAEliminar?.cat}/${paramAEliminar?.tipo}?`} textoConfirmar="Eliminar" />
    </div>
  )
}
