/**
 * La escalera de rivales (como el modo arcade de Head Soccer): hay que ganar
 * al primero para poder jugar contra el segundo, y así. Ganarle a un DJ lo
 * desbloquea para jugar con él. La dificultad sube con la escalera: el nivel
 * de la IA y sus estadísticas dependen del escalón.
 *
 * Contra cada rival hay además logros (insignias): ganarle sin encajar, sin
 * saltar… Todo se calcula a partir del historial de partidos: no hay un
 * registro aparte que pueda descuadrarse, y la copia de seguridad, que ya
 * lleva el historial, se lleva también el progreso.
 */
import type { Level, MatchRecord } from '../types'
import { DJS, STARTER, type DjId } from './djs'

/** Los rivales, en orden. El inicial no está: es contra quien no hace falta ganar. */
export const LADDER: DjId[] = ['karl', 'marsmelou', 'ritxie', 'mismonik', 'deadmouse', 'daft', 'solomoon', 'klaptone', 'boris', 'ihm']

/** El nivel de la IA en cada escalón: tres para calentar, cuatro serios y tres finales. */
export function levelOfRung(rung: number): Level {
  return rung < 3 ? 'warmup' : rung < 7 ? 'peak' : 'closing'
}

/** Los niveles de mejora del rival de cada escalón (0 el primero, 9 el último). */
export function statLevelOfRung(rung: number): number {
  return rung
}

const won = (m: MatchRecord) => m.goalsFor > m.goalsAgainst

/** Las victorias contra un rival, en cualquier orden. */
function winsAgainst(history: MatchRecord[], rival: DjId): MatchRecord[] {
  return history.filter((m) => m.rivalDj === rival && won(m))
}

export type BadgeId = 'clean' | 'rout' | 'golden' | 'nopower' | 'nodash' | 'nokick' | 'nojump' | 'ten'

export type Badge = { id: BadgeId; title: string }

/**
 * Los logros que se pueden ganar contra cada rival. Los de «sin…» solo valen
 * en partidos que ya contaban esas acciones: en uno anterior no se sabe si se
 * saltó o no, y no puede regalar la insignia.
 */
export const BADGES: Badge[] = [
  { id: 'clean', title: 'Gana sin encajar ningún gol' },
  { id: 'rout', title: 'Gana por 5 goles de diferencia' },
  { id: 'golden', title: 'Gana con gol de oro' },
  { id: 'nopower', title: 'Gana sin usar tu habilidad' },
  { id: 'nodash', title: 'Gana sin usar el dash' },
  { id: 'nokick', title: 'Gana sin chutar' },
  { id: 'nojump', title: 'Gana sin saltar' },
  { id: 'ten', title: 'Gánale 10 veces' },
]

/** ¿Cumple este partido (ganado) el logro? `ten` no se mira partido a partido. */
export function matchEarns(m: MatchRecord, badge: BadgeId): boolean {
  if (!won(m)) return false
  switch (badge) {
    case 'clean':
      return m.goalsAgainst === 0
    case 'rout':
      return m.goalsFor - m.goalsAgainst >= 5
    case 'golden':
      return m.goldenGoal
    case 'nopower':
      return m.powers === 0
    case 'nodash':
      return m.dashes === 0
    case 'nokick':
      return m.kicks === 0
    case 'nojump':
      return m.jumps === 0
    case 'ten':
      return false
  }
}

/** Los logros conseguidos contra un rival. */
export function badgesAgainst(history: MatchRecord[], rival: DjId): Set<BadgeId> {
  const wins = winsAgainst(history, rival)
  const out = new Set<BadgeId>()
  for (const b of BADGES) {
    if (b.id === 'ten' ? wins.length >= 10 : wins.some((m) => matchEarns(m, b.id))) out.add(b.id)
  }
  return out
}

export type LadderState = {
  /** Rivales a los que ya se ha ganado. */
  beaten: Set<DjId>
  /** Cuántos escalones están abiertos (se puede jugar contra los `open` primeros). */
  open: number
  /** DJs con los que se puede jugar. */
  playable: Set<DjId>
}

/** Dónde se está en la escalera con este historial (o todo abierto, en modo prueba). */
export function ladderState(history: MatchRecord[], all = false): LadderState {
  const beaten = new Set<DjId>(LADDER.filter((id) => winsAgainst(history, id).length > 0))
  if (all) return { beaten, open: LADDER.length, playable: new Set(DJS.map((d) => d.id)) }
  let open = 1
  while (open < LADDER.length && beaten.has(LADDER[open - 1])) open++
  return { beaten, open, playable: new Set<DjId>([STARTER, ...beaten]) }
}

/** Lo que desbloquea el último partido: DJs para jugar y logros nuevos contra su rival. */
export function unlockedBy(before: MatchRecord[], after: MatchRecord[], rival: DjId): { djs: DjId[]; badges: BadgeId[] } {
  const was = ladderState(before)
  const now = ladderState(after)
  const djs = DJS.map((d) => d.id).filter((id) => now.playable.has(id) && !was.playable.has(id))
  const had = badgesAgainst(before, rival)
  const badges = [...badgesAgainst(after, rival)].filter((b) => !had.has(b))
  return { djs, badges }
}

export function rungOf(rival: DjId): number {
  const i = LADDER.indexOf(rival)
  return i < 0 ? 0 : i
}
