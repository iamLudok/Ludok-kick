// Ajustes. Sin imports nativos a propósito: el hook reactivo vive en
// `src/hooks/useSettings.ts`, para que esta lógica se pueda probar en Node.
import { eq } from 'drizzle-orm'
import { BEAT } from '../game/constants'
import { DEFAULT_SETTINGS, readSettings, writeSettings } from './backupCore'
import { getDb } from './dbRef'
import { settings as settingsTable } from './schema'
import type { Settings } from '../types'

export { DEFAULT_SETTINGS }

/** Lectura sola: devuelve los ajustes guardados o los por defecto (sin escribir). */
export function getSettings(): Promise<Settings> {
  return readSettings(getDb())
}

/** Persiste los ajustes por defecto si aún no existen. Llamar una vez al arrancar. */
export async function ensureSettings(): Promise<void> {
  const db = getDb()
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.id, 'app')).limit(1)
  if (!rows[0]) await writeSettings(db, DEFAULT_SETTINGS)
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await writeSettings(getDb(), { ...current, ...patch, id: 'app' })
}

/** Deja un desfase en milisegundos enteros y dentro de lo que la app admite. */
export function clampOffsetMs(ms: number): number {
  return Math.max(-BEAT.MAX_OFFSET_MS, Math.min(BEAT.MAX_OFFSET_MS, Math.round(ms)))
}

export function saveAudioOffset(ms: number): Promise<void> {
  return updateSettings({ audioOffsetMs: clampOffsetMs(ms) })
}

/** Vuelve a «sin calibrar»: se usará el desfase que diga el propio móvil. */
export function clearAudioOffset(): Promise<void> {
  return updateSettings({ audioOffsetMs: undefined })
}

/**
 * El desfase que se usa de verdad al jugar. Si el jugador calibró, manda su
 * medida; si no, lo que el móvil dice que tarda su salida de audio; y si ni
 * eso se sabe, un valor típico.
 */
export function effectiveOffsetMs(settings: Settings, deviceLatencyMs: number): number {
  if (settings.audioOffsetMs !== undefined) return settings.audioOffsetMs
  if (deviceLatencyMs > 0) return clampOffsetMs(deviceLatencyMs)
  return BEAT.DEFAULT_OFFSET_MS
}
