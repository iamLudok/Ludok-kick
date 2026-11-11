import { useMemo } from 'react'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import type { DjId } from '../content/djs'
import { unlockedDjs } from '../content/missions'
import { db } from '../lib/db'
import { tally, type Tally } from '../lib/matches'
import { rowToMatch } from '../lib/rows'
import { matches as matchesTable } from '../lib/schema'
import { LEVELS, type Level, type MatchRecord } from '../types'

/**
 * Todo el historial, reactivo: se actualiza solo al acabar un partido o al
 * importar una copia. De él salen el balance y los desbloqueos.
 */
export function useHistory(): { history: MatchRecord[]; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(matchesTable))
  const history = useMemo(() => (data ?? []).map(rowToMatch), [data])
  return { history, ready: updatedAt !== undefined }
}

/** Balance contra cada nivel. */
export function useLevelTallies(): { data: Record<Level, Tally>; ready: boolean } {
  const { history, ready } = useHistory()
  const data = useMemo(() => {
    const out = {} as Record<Level, Tally>
    for (const level of LEVELS) out[level] = tally(history.filter((m) => m.level === level))
    return out
  }, [history])
  return { data, ready }
}

/**
 * Los DJs que se pueden elegir. Mientras la base no responde se da por
 * desbloqueado solo el inicial: es lo seguro (nunca deja elegir uno que no
 * toca), y dura un instante.
 */
export function useUnlocks(): { unlocked: Set<DjId>; history: MatchRecord[]; ready: boolean } {
  const { history, ready } = useHistory()
  const unlocked = useMemo(() => unlockedDjs(history), [history])
  return { unlocked, history, ready }
}
