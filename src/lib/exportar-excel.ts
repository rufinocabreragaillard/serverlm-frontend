import * as XLSX from 'xlsx'

export interface ColumnaExport {
  titulo: string
  campo: string
  formato?: (valor: unknown, fila: Record<string, unknown>) => string | number | boolean
}

/**
 * Exporta un array de datos a un archivo Excel (.xlsx).
 * @param datos - Array de objetos con los datos a exportar (ya filtrados)
 * @param columnas - Definición de columnas: título para el encabezado, campo del objeto, formato opcional
 * @param nombreArchivo - Nombre del archivo sin extensión
 * @param nombreHoja - Nombre de la hoja (default: "Datos")
 */
export function exportarExcel(
  datos: Record<string, unknown>[],
  columnas: ColumnaExport[],
  nombreArchivo: string,
  nombreHoja = 'Datos'
) {
  if (datos.length === 0) return

  const filas = datos.map((d) =>
    columnas.reduce((fila, col) => {
      const valor = d[col.campo]
      fila[col.titulo] = col.formato ? col.formato(valor, d) : (valor ?? '')
      return fila
    }, {} as Record<string, unknown>)
  )

  const ws = XLSX.utils.json_to_sheet(filas)

  // Auto-ajustar ancho de columnas
  const anchos = columnas.map((col) => {
    const maxLen = Math.max(
      col.titulo.length,
      ...filas.map((f) => String(f[col.titulo] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  ws['!cols'] = anchos

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}
