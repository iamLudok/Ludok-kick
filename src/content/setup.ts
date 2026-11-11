/**
 * Lo que define un partido: tu DJ, el rival, el escenario y el nivel. Viaja
 * entre pantallas como parámetros de la ruta, que siempre son texto: aquí se
 * convierte en un objeto con valores válidos (lo que no se reconoce cae a un
 * valor por defecto en vez de romper la pantalla).
 */
import { isLevel, type Level } from '../types'
import { DJS, isDjId, pickRival, type DjId } from './djs'
import { STAGES, isStageId, type StageId } from './stages'

export type MatchSetup = {
  dj: DjId
  rival: DjId
  stage: StageId
  level: Level
}

type RawParams = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export function readSetup(params: RawParams): MatchSetup {
  const dj = one(params.dj)
  const rival = one(params.rival)
  const stage = one(params.stage)
  const level = one(params.nivel)
  const mine: DjId = isDjId(dj) ? dj : DJS[0].id
  return {
    dj: mine,
    rival: isDjId(rival) && rival !== mine ? rival : pickRival(mine),
    stage: isStageId(stage) ? stage : STAGES[0].id,
    level: isLevel(level) ? level : 'peak',
  }
}

export function setupParams(s: MatchSetup): Record<string, string> {
  return { dj: s.dj, rival: s.rival, stage: s.stage, nivel: s.level }
}

/** Cómo acabó, para la pantalla de resultado. */
export type MatchResult = {
  goalsFor: number
  goalsAgainst: number
  golden: boolean
  perfects: number
  goods: number
  powers: number
}

export function resultParams(r: MatchResult): Record<string, string> {
  return {
    gf: String(r.goalsFor),
    ga: String(r.goalsAgainst),
    oro: r.golden ? '1' : '0',
    perfect: String(r.perfects),
    good: String(r.goods),
    poderes: String(r.powers),
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
  }
}
