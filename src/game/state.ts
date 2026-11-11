import { BALL, BEAT, FIELD, MATCH, PLAYER } from './constants'
import type { GameState, InputFrame, PlayerState, PlayerStats, Side } from './types'

export const BASE_STATS: PlayerStats = { speed: 1, jump: 1, kick: 1, timing: 1, power: null }

export function emptyInput(): InputFrame {
  'worklet'
  return { move: 0, jump: false, kick: false, power: false }
}

export function startX(side: Side): number {
  'worklet'
  return side === 0 ? PLAYER.START_X : FIELD.W - PLAYER.START_X
}

function createPlayer(side: Side, stats: PlayerStats): PlayerState {
  'worklet'
  return {
    side,
    facing: side === 0 ? 1 : -1,
    x: startX(side),
    y: FIELD.GROUND_Y,
    vx: 0,
    vy: 0,
    grounded: true,
    kickT: -1,
    kickCd: 0,
    kickHit: false,
    touchCd: 0,
    // Copia: el estado se muta en cada paso y no debe compartir objeto con la
    // ficha del personaje.
    stats: { speed: stats.speed, jump: stats.jump, kick: stats.kick, timing: stats.timing, power: stats.power },
    energy: 0,
    power: null,
    powerHeld: false,
    scratch: false,
    slowT: 0,
    recoverT: 0,
  }
}

export function createInitialState(stats0?: PlayerStats, stats1?: PlayerStats, seed = 1): GameState {
  'worklet'
  // El valor por defecto se resuelve aquí dentro y no en la firma
  // (`stats0 = BASE_STATS`): el compilador de worklets no captura las variables
  // que solo aparecen en un parámetro por defecto, y en el hilo de UI reventaba
  // con «Property 'BASE_STATS' doesn't exist». En Node no se nota.
  const a = stats0 ?? BASE_STATS
  const b = stats1 ?? BASE_STATS
  return {
    phase: 'kickoff',
    phaseT: MATCH.KICKOFF_DELAY,
    timeLeft: MATCH.DURATION,
    golden: false,
    score: [0, 0],
    players: [createPlayer(0, a), createPlayer(1, b)],
    ball: { x: FIELD.W / 2, y: BALL.DROP_Y, vx: 0, vy: 0, angle: 0, spin: 0, curveT: 0, curveDir: 1, loopT: 0 },
    acc: 0,
    tick: 0,
    events: [],
    contact: { nx: 0, ny: 0, pen: 0 },
    beat: { on: false, now: 0, t0: 0, bpm: BEAT.BPM_START, dropAt: -1 },
    speed: 1,
    scorer: 0,
    seed: seed | 0,
  }
}

/** Todos a su sitio y el vinilo arriba en el centro, tras un gol. */
export function resetForKickoff(s: GameState): void {
  'worklet'
  for (const p of s.players) {
    p.x = startX(p.side)
    p.y = FIELD.GROUND_Y
    p.vx = 0
    p.vy = 0
    p.grounded = true
    p.kickT = -1
    p.kickCd = 0
    p.kickHit = false
    p.touchCd = 0
    // La energía, el poder guardado y un Scratch preparado se conservan de un
    // saque a otro: se pagaron con remates y no deben perderse por un gol. La
    // cámara lenta, en cambio, se corta: el saque empieza limpio.
    p.slowT = 0
    p.recoverT = 0
  }
  const b = s.ball
  b.x = FIELD.W / 2
  b.y = BALL.DROP_Y
  b.vx = 0
  b.vy = 0
  b.spin = 0
  b.curveT = 0
  b.loopT = 0
  s.phase = 'kickoff'
  s.phaseT = MATCH.KICKOFF_DELAY
}
