// Capa nativa de las copias de seguridad: ficheros, compartir y selector.
// Toda la lógica de datos vive en `backupCore.ts`, que se prueba aparte.
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as core from './backupCore'
import { db } from './db'
import { updateSettings } from './settings'

export type { ImportResult } from './backupCore'

export function importBackup(raw: string, mode: 'replace' | 'merge' = 'replace'): Promise<core.ImportResult> {
  return core.importBackup(db, raw, mode)
}

function backupFilename(): string {
  const d = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `ludok-kick-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

/**
 * Escribe la copia y abre el menú de compartir para guardarla donde quieras
 * (Archivos, Nextcloud, Drive…). Devuelve la ruta del fichero generado.
 */
export async function shareBackup(): Promise<string> {
  const data = await core.exportAll(db)
  const file = new File(Paths.cache, backupFilename())
  file.create({ overwrite: true })
  file.write(JSON.stringify(data, null, 2))

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Copia de Ludok Kick',
      UTI: 'public.json',
    })
  }
  await updateSettings({ lastBackup: Date.now() })
  return file.uri
}

/** Abre el selector de ficheros y devuelve el contenido del JSON elegido. */
export async function pickJsonFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  })
  if (res.canceled || !res.assets?.[0]) return null
  return await new File(res.assets[0].uri).text()
}
