import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { DEFAULT_SETTINGS } from '../lib/backupCore'
import { db } from '../lib/db'
import { rowToSettings } from '../lib/rows'
import { settings as settingsTable } from '../lib/schema'
import type { Settings } from '../types'

/**
 * Ajustes actuales, reactivos, y si ya hay respuesta de la base. Está aquí y
 * no en `lib/settings.ts` porque `useLiveQuery` es de expo-sqlite y solo
 * funciona en el móvil; así la lógica de ajustes sigue siendo probable en el
 * escritorio.
 *
 * `ready` importa: `useLiveQuery` arranca con la lista vacía, así que durante
 * un instante «sin calibrar» y «todavía no he leído» se ven igual.
 */
export function useSettings(): { data: Settings; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(settingsTable).where(eq(settingsTable.id, 'app')))
  return {
    data: data?.[0] ? rowToSettings(data[0]) : DEFAULT_SETTINGS,
    ready: updatedAt !== undefined,
  }
}
