import { desc } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { db } from '../lib/db'
import { tally, type Tally } from '../lib/matches'
import { rowToMatch } from '../lib/rows'
import { matches as matchesTable } from '../lib/schema'
import { LEVELS, type Level } from '../types'

/** Balance contra cada nivel, reactivo: se actualiza solo al acabar un partido. */
export function useLevelTallies(): { data: Record<Level, Tally>; ready: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt)))
  const all = (data ?? []).map(rowToMatch)
  const out = {} as Record<Level, Tally>
  for (const level of LEVELS) out[level] = tally(all.filter((m) => m.level === level))
  return { data: out, ready: updatedAt !== undefined }
}
