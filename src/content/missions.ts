/**
 * Las misiones que desbloquean DJs. Cada DJ menos el inicial tiene la suya.
 *
 * No hay un registro aparte de «qué está desbloqueado»: todo se calcula a
 * partir del historial de partidos. Así no hay dos cosas que puedan
 * descuadrarse (un DJ desbloqueado sin el partido que lo desbloqueó), y la
 * copia de seguridad, que ya lleva el historial, se lleva también el progreso.
 */
import type { MatchRecord } from '../types'
import { DJS, STARTER, type DjId } from './djs'

export type Mission = {
  dj: DjId
  title: string
  /** Cuánto hay que llegar a tener. */
  target: number
  /** Cuánto se lleva, según el historial (en cualquier orden). */
  progress: (history: MatchRecord[]) => number
}

const won = (m: MatchRecord) => m.goalsFor > m.goalsAgainst
const wins = (h: MatchRecord[]) => h.filter(won)
const best = (h: MatchRecord[], f: (m: MatchRecord) => number) => h.reduce((acc, m) => Math.max(acc, f(m)), 0)

/** La racha más larga de victorias seguidas, por orden de juego. */
function longestWinRun(h: MatchRecord[]): number {
  let run = 0
  let longest = 0
  for (const m of [...h].sort((a, b) => a.playedAt - b.playedAt)) {
    run = won(m) ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  return longest
}

const BASE_MISSIONS: Mission[] = [
  { dj: 'karl', title: 'Gana tu primer partido', target: 1, progress: (h) => wins(h).length },
  { dj: 'dabid', title: 'Mete 6 PERFECT en un partido', target: 6, progress: (h) => best(h, (m) => m.perfects) },
  {
    dj: 'daft',
    title: 'Gana en Peak Time o en Closing',
    target: 1,
    progress: (h) => wins(h).filter((m) => m.level === 'peak' || m.level === 'closing').length,
  },
  { dj: 'deadmouse', title: 'Gana sin encajar ningún gol', target: 1, progress: (h) => wins(h).filter((m) => m.goalsAgainst === 0).length },
  { dj: 'marsmelou', title: 'Lanza 3 poderes en un partido', target: 3, progress: (h) => best(h, (m) => m.powers ?? 0) },
  { dj: 'carlota', title: 'Gana en los 3 escenarios', target: 3, progress: (h) => new Set(wins(h).map((m) => m.stage).filter(Boolean)).size },
  { dj: 'ameli', title: 'Gana con gol de oro', target: 1, progress: (h) => wins(h).filter((m) => m.goldenGoal).length },
  { dj: 'arnim', title: 'Encadena 5 PERFECT seguidos', target: 5, progress: (h) => best(h, (m) => m.bestStreak ?? 0) },
  { dj: 'ritxie', title: 'Gana 3 partidos seguidos', target: 3, progress: longestWinRun },
  { dj: 'solomoon', title: 'Gana en Closing', target: 1, progress: (h) => wins(h).filter((m) => m.level === 'closing').length },
  { dj: 'klaptone', title: 'Consigue 10 victorias', target: 10, progress: (h) => wins(h).length },
  {
    dj: 'boris',
    title: 'Gana en Closing por 3 goles de diferencia',
    target: 1,
    progress: (h) => wins(h).filter((m) => m.level === 'closing' && m.goalsFor - m.goalsAgainst >= 3).length,
  },
]

/** La última: completar todas las demás. */
const FINAL: Mission = {
  dj: 'ihm',
  title: 'Completa todas las demás misiones',
  target: BASE_MISSIONS.length,
  progress: (h) => BASE_MISSIONS.filter((m) => m.progress(h) >= m.target).length,
}

export const MISSIONS: Mission[] = [...BASE_MISSIONS, FINAL]

export function missionFor(dj: DjId): Mission | undefined {
  return MISSIONS.find((m) => m.dj === dj)
}

export function isDone(m: Mission, history: MatchRecord[]): boolean {
  return m.progress(history) >= m.target
}

/** Los DJs que se pueden elegir con este historial. */
export function unlockedDjs(history: MatchRecord[]): Set<DjId> {
  const out = new Set<DjId>([STARTER])
  for (const m of MISSIONS) if (isDone(m, history)) out.add(m.dj)
  return out
}

/** Los DJs que desbloquea el último partido: los que antes no estaban y ahora sí. */
export function newlyUnlocked(before: MatchRecord[], after: MatchRecord[]): DjId[] {
  const was = unlockedDjs(before)
  const now = unlockedDjs(after)
  return DJS.map((d) => d.id).filter((id) => now.has(id) && !was.has(id))
}
