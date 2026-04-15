import { getDirectoryHandle, ensureReadPermission } from './file-handle-store'
import { abrirArchivoPorRuta } from './extraer-texto'

const IS_CLIENT_MODE = process.env.NEXT_PUBLIC_MODE === 'client'
const API_LOCAL = 'http://localhost:27182'

async function abrirViaApiLocal(ruta: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_LOCAL}/abrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruta }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function abrirViaFileSystemApi(ubicacion: string): Promise<void> {
  const handle = await getDirectoryHandle()
  if (!handle) {
    alert('No hay carpeta raíz seleccionada. Ve a "Procesar Documentos" y selecciona el directorio raíz primero.')
    return
  }
  const ok = await ensureReadPermission(handle)
  if (!ok) { alert('Permiso de lectura denegado.'); return }
  const fileHandle = await abrirArchivoPorRuta(handle, ubicacion)
  if (!fileHandle) { alert(`No se encontró: ${ubicacion}`); return }
  const file = await fileHandle.getFile()
  const url = URL.createObjectURL(file)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function abrirDocumento(ubicacion: string | null | undefined): Promise<void> {
  if (!ubicacion) { alert('Este documento no tiene ubicación registrada.'); return }

  if (IS_CLIENT_MODE) {
    const ok = await abrirViaApiLocal(ubicacion)
    if (ok) return
    // Fallback a File System Access API si la API local no responde
  }

  try {
    await abrirViaFileSystemApi(ubicacion)
  } catch (e) {
    alert(`Error al abrir: ${e instanceof Error ? e.message : e}`)
  }
}
