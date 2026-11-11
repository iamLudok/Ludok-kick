// Historial de partidos. Sin imports nativos: pide la base a `dbRef`.
import { desc } from 'drizzle-orm'
import { getDb } from './dbRef'
import { newId } from './ids'
import { matchToRow, rowToMatch } from './rows'
import { matches as matchesTable } from './schema'
import type { MatchRecord } from '../types'

/** Guarda un partido terminado y lo devuelve con su id y su fecha. */
export async function addMatch(match: Omit<MatchRecord, 'id' | 'playedAt'>, playedAt = Date.now()): Promise<MatchRecord> {
  if (match.goalsFor < 0 || match.goalsAgainst < 0) {
    throw new Error('Un marcador no puede ser negativo.')
  }
  const record: MatchRecord = { ...match, id: newId(), playedAt }
  await getDb().insert(matchesTable).values(matchToRow(record))
  return record
}

/** Los últimos partidos, del más reciente al más antiguo. */
export async function listMatches(limit = 50): Promise<MatchRecord[]> {
  const rows = await getDb().select().from(matchesTable).orderBy(desc(matchesTable.playedAt)).limit(limit)
  return rows.map(rowToMatch)
}

export type Tally = { played: number; won: number; drawn: number; lost: number }

export function tally(matches: MatchRecord[]): Tally {
  const out: Tally = { played: matches.length, won: 0, drawn: 0, lost: 0 }
  for (const m of matches) {
    if (m.goalsFor > m.goalsAgainst) out.won++
    else if (m.goalsFor < m.goalsAgainst) out.lost++
    else out.drawn++
  }
  return out
}
