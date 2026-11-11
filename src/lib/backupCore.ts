// Núcleo de las copias de seguridad: solo consultas Drizzle, sin nada nativo.
//
// Está separado de `backup.ts` a propósito. Aquí no se importa expo-file-system
// ni expo-sqlite, así que este código se puede ejecutar tal cual en Node contra
// un SQLite de escritorio para probarlo. Como recibe la base de datos por
// parámetro, el test ejecuta EXACTAMENTE el mismo código que corre en el móvil,
// que es lo único que hace que la prueba valga para algo.
import { eq } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import { matchToRow, rowToMatch, rowToSettings, settingsToRow } from './rows'
import { matches as matchesTable, settings as settingsTable } from './schema'
import { chunk, excludedSet } from './sqlHelpers'
import { SCHEMA_VERSION } from './version'
import type { BackupFile, Settings } from '../types'

export { SCHEMA_VERSION }

/** Cualquier base de datos SQLite de Drizzle (expo-sqlite en el móvil, libsql en los tests). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = BaseSQLiteDatabase<any, any, any>

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  musicVolume: 1,
  sfxVolume: 1,
  lastBackup: 0,
  schemaVersion: SCHEMA_VERSION,
}

export async function readSettings(database: AppDb): Promise<Settings> {
  const rows = await database.select().from(settingsTable).where(eq(settingsTable.id, 'app')).limit(1)
  return rows[0] ? rowToSettings(rows[0]) : DEFAULT_SETTINGS
}

export async function writeSettings(database: AppDb, next: Settings): Promise<void> {
  const row = settingsToRow(next)
  await database.insert(settingsTable).values(row).onConflictDoUpdate({ target: settingsTable.id, set: row })
}

/** Serializa toda la base de datos a un objeto de copia. */
export async function exportAll(database: AppDb): Promise<BackupFile> {
  const matchRows = await database.select().from(matchesTable)
  // El desfase de audio NO se exporta: es una medida de este móvil con estos
  // auriculares. Restaurado en otro aparato, todos los remates se juzgarían
  // con el retraso del móvil viejo, y no habría forma de notar por qué.
  // El modo prueba tampoco: es para probar en este móvil, no algo que deba
  // aparecer activado al restaurar una copia en otro.
  const { audioOffsetMs: _deviceOnly, unlockAll: _testOnly, ...portable } = await readSettings(database)
  return {
    app: 'ludok-kick',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    matches: matchRows.map(rowToMatch),
    settings: portable,
  }
}

export interface ImportResult {
  matches: number
}

/**
 * Importa una copia. 'replace' vacía antes lo que haya; 'merge' añade/actualiza
 * por id sin borrar nada. Todo dentro de una transacción: si algo falla a mitad
 * no se queda la base de datos a medias.
 */
export async function importBackup(
  database: AppDb,
  raw: string,
  mode: 'replace' | 'merge' = 'replace',
): Promise<ImportResult> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('El fichero no es un JSON válido.')
  }
  if (!parsed || parsed.app !== 'ludok-kick' || !Array.isArray(parsed.matches)) {
    throw new Error('Esto no parece una copia de Ludok Kick.')
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `La copia es de una versión más nueva (v${parsed.schemaVersion}). Actualiza la app antes de importar.`,
    )
  }

  const incoming = parsed.matches

  await database.transaction(async (tx: AppDb) => {
    if (mode === 'replace') await tx.delete(matchesTable)
    for (const part of chunk(incoming)) {
      await tx
        .insert(matchesTable)
        .values(part.map(matchToRow))
        .onConflictDoUpdate({ target: matchesTable.id, set: excludedSet(matchesTable) })
    }
  })

  // Las preferencias se restauran; la calibración de audio y la fecha de la
  // última copia son de este móvil y se quedan como estén.
  if (parsed.settings) {
    const current = await readSettings(database)
    await writeSettings(database, {
      ...current,
      musicVolume: parsed.settings.musicVolume ?? current.musicVolume,
      sfxVolume: parsed.settings.sfxVolume ?? current.sfxVolume,
      lastDj: parsed.settings.lastDj ?? current.lastDj,
      lastStage: parsed.settings.lastStage ?? current.lastStage,
      lastLevel: parsed.settings.lastLevel ?? current.lastLevel,
      showPerf: parsed.settings.showPerf ?? current.showPerf,
      id: 'app',
    })
  }

  return { matches: incoming.length }
}
