import { FileText, Image as ImageIcon, FileSpreadsheet, FileArchive, FileCode, File, Presentation } from 'lucide-react'

/** Icono según extensión del archivo */
export function iconoTipoArchivo(nombre: string, size = 14, className = 'text-texto-muted shrink-0') {
  const ext = nombre.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return <FileText size={size} className="text-red-400 shrink-0" />
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'bmp': case 'svg': case 'tiff': case 'tif':
      return <ImageIcon size={size} className="text-blue-400 shrink-0" />
    case 'xls': case 'xlsx': case 'xlsm': case 'csv':
      return <FileSpreadsheet size={size} className="text-green-500 shrink-0" />
    case 'pptx': case 'potx': case 'ppsx': case 'ppt':
      return <Presentation size={size} className="text-orange-500 shrink-0" />
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz':
      return <FileArchive size={size} className="text-amber-500 shrink-0" />
    case 'html': case 'xml': case 'json': case 'js': case 'ts': case 'py':
      return <FileCode size={size} className="text-purple-400 shrink-0" />
    case 'doc': case 'docx':
      return <FileText size={size} className="text-blue-500 shrink-0" />
    default:
      return <File size={size} className={className} />
  }
}
