'use client'

import { Boton } from '@/components/ui/boton'

interface PieBotonesModalProps {
  editando: boolean
  onGuardar: () => void
  onGuardarYSalir: () => void
  onCerrar: () => void
  cargando?: boolean
}

export function PieBotonesModal({
  editando,
  onGuardar,
  onGuardarYSalir,
  onCerrar,
  cargando,
}: PieBotonesModalProps) {
  return (
    <div className="flex gap-3 justify-end pt-2">
      <Boton variante="primario" onClick={onGuardar} cargando={cargando}>
        {editando ? 'Grabar' : 'Crear'}
      </Boton>
      <Boton variante="secundario" onClick={onGuardarYSalir} cargando={cargando}>
        {editando ? 'Grabar y Salir' : 'Crear y Salir'}
      </Boton>
      <Boton variante="contorno" onClick={onCerrar}>
        Salir
      </Boton>
    </div>
  )
}
