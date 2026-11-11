import { useMemo } from 'react'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { ladderState, type LadderState } from '../content/ladder'
import { db } from '../lib/db'
import { useSettings } from './useSettings'
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
 * Dónde se está en la escalera: con qué DJs se puede jugar y contra qué
 * rivales. Mientras la base no responde, solo el inicial y el primer rival:
 * es lo seguro (nunca deja elegir algo que no toca), y dura un instante.
 */
export function useLadder(): { ladder: LadderState; history: MatchRecord[]; ready: boolean } {
  const { history, ready } = useHistory()
  const { data: settings } = useSettings()
  const all = settings.unlockAll === true
  const ladder = useMemo(() => ladderState(history, all), [history, all])
  return { ladder, history, ready }
}
