/**
 * Lo que define un partido: tu DJ, el rival, el escenario y el nivel. Viaja
 * entre pantallas como parámetros de la ruta, que siempre son texto: aquí se
 * convierte en un objeto con valores válidos (lo que no se reconoce cae a un
 * valor por defecto en vez de romper la pantalla).
 */
import type { Level } from '../types'
import { DJS, isDjId, pickRival, type DjId } from './djs'
import { BADGES, LADDER, levelOfRung, rungOf, type BadgeId } from './ladder'
import { STAGES, isStageId, type StageId } from './stages'

export type MatchSetup = {
  dj: DjId
  rival: DjId
  stage: StageId
}

/** El nivel de la IA no se elige: es el del escalón del rival. */
export function levelOf(setup: MatchSetup): Level {
  return levelOfRung(rungOf(setup.rival))
}

type RawParams = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export function readSetup(params: RawParams): MatchSetup {
  const dj = one(params.dj)
  const rival = one(params.rival)
  const stage = one(params.stage)
  const mine: DjId = isDjId(dj) ? dj : DJS[0].id
  return {
    dj: mine,
    rival: isDjId(rival) && rival !== mine ? rival : LADDER.find((id) => id !== mine) ?? pickRival(mine),
    stage: isStageId(stage) ? stage : STAGES[0].id,
  }
}

export function setupParams(s: MatchSetup): Record<string, string> {
  return { dj: s.dj, rival: s.rival, stage: s.stage }
}

/** Cómo acabó, para la pantalla de resultado. */
export type MatchResult = {
  goalsFor: number
  goalsAgainst: number
  golden: boolean
  perfects: number
  goods: number
  powers: number
  bestStreak: number
  /** Monedas ganadas, y lo que desbloqueó el partido. */
  coins: number
  newDjs: DjId[]
  newBadges: BadgeId[]
}

export function resultParams(r: MatchResult): Record<string, string> {
  return {
    gf: String(r.goalsFor),
    ga: String(r.goalsAgainst),
    oro: r.golden ? '1' : '0',
    perfect: String(r.perfects),
    good: String(r.goods),
    poderes: String(r.powers),
    racha: String(r.bestStreak),
    monedas: String(r.coins),
    nuevos: r.newDjs.join(','),
    logros: r.newBadges.join(','),
  }
}

export function readResult(params: RawParams): MatchResult {
  const n = (k: string) => {
    const v = Number(one(params[k]))
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
  }
  return {
    goalsFor: n('gf'),
    goalsAgainst: n('ga'),
    golden: one(params.oro) === '1',
    perfects: n('perfect'),
    goods: n('good'),
    powers: n('poderes'),
    bestStreak: n('racha'),
    coins: n('monedas'),
    newDjs: (one(params.nuevos) ?? '').split(',').filter(isDjId),
    newBadges: (one(params.logros) ?? '').split(',').filter((b): b is BadgeId => BADGES.some((x) => x.id === b)),
  }
}
