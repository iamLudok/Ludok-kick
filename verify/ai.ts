/**
 * Prueba la IA enfrentándola a sí misma y a un rival quieto, con el mismo
 * código que corre en el móvil. No mide si «parece humana» (eso solo se ve
 * jugando), sino lo que tiene que cumplirse siempre: que los niveles están
 * ordenados, que los altos rematan más al ritmo, que nunca se queda atascada y
 * que no se mete goles en propia a lo tonto.
 *
 * Todo con semillas fijas: si algo falla, falla igual la próxima vez.
 */
import { createAi, stepAi, type AiState } from '../src/game/ai'
import { AI, FIELD, MATCH, PLAYER } from '../src/game/constants'
import { createInitialState, emptyInput } from '../src/game/state'
import { stepGame } from '../src/game/step'
import type { GameState, InputFrame } from '../src/game/types'
import type { Level } from '../src/types'

let failures = 0

function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

type Result = {
  score: [number, number]
  ended: boolean
  /** Toques con el pie de cada lado y cuántos fueron PERFECT. */
  kicks: [number, number]
  perfectKicks: [number, number]
  /** Lo máximo que el vinilo pasó en juego parado, en segundos. */
  longestIdle: number
}

const DT = 1 / 60

/** Un partido entero a 60 Hz con música a 120 BPM. `null` es un rival que no se mueve. */
function play(l0: Level | null, l1: Level | null, seed: number): Result {
  const s: GameState = createInitialState()
  const ai: [AiState | null, AiState | null] = [l0 ? createAi(l0, seed * 7 + 1) : null, l1 ? createAi(l1, seed * 13 + 5) : null]
  const idle = emptyInput()
  const r: Result = { score: [0, 0], ended: false, kicks: [0, 0], perfectKicks: [0, 0], longestIdle: 0 }
  let t = 0
  let still = 0
  // Como hace la música de verdad: al marcarse un gol, contesta con el
  // instante del drop.
  const beat = { time: 0, t0: 0.3, bpm: 120, dropAt: -1 }
  // El tope de tiempo cubre un gol de oro largo; si se pasa, el partido no acabó.
  for (let i = 0; i < (MATCH.DURATION + 60) / DT && s.phase !== 'ended'; i++) {
    t += DT
    // Copia del input: la IA reutiliza su objeto de salida en cada frame.
    const in0: InputFrame = ai[0] ? { ...stepAi(ai[0], s, 0, DT) } : idle
    const in1: InputFrame = ai[1] ? { ...stepAi(ai[1], s, 1, DT) } : idle
    beat.time = t
    stepGame(s, in0, in1, DT, beat)
    for (const e of s.events) if (e.type === 'goal') beat.dropAt = e.at + MATCH.GOAL_FREEZE
    // Parado de verdad: un vinilo empujado con el cuerpo no cuenta como toque,
    // pero se mueve, y eso no es un atasco.
    const moving = Math.abs(s.ball.vx) + Math.abs(s.ball.vy) >= 60
    still = s.phase === 'play' && !moving ? still + DT : 0
    for (const e of s.events) {
      if (e.type === 'kick') {
        r.kicks[e.side]++
        if (e.judge === 2) r.perfectKicks[e.side]++
      }
    }
    r.longestIdle = Math.max(r.longestIdle, still)
  }
  r.score = [s.score[0], s.score[1]]
  r.ended = s.phase === 'ended'
  return r
}

/** Cuántos partidos gana `a` a `b` de `n`, alternando quién juega a cada lado. */
function wins(a: Level, b: Level, n: number): number {
  let w = 0
  for (let k = 0; k < n; k++) {
    if (k % 2 === 0) {
      const r = play(a, b, k)
      if (r.score[0] > r.score[1]) w++
    } else {
      const r = play(b, a, k)
      if (r.score[1] > r.score[0]) w++
    }
  }
  return w
}

const LEVELS: Level[] = ['warmup', 'peak', 'closing']
const N = 20

/* --- Determinismo -------------------------------------------------------- */
{
  const a = play('peak', 'closing', 3)
  const b = play('peak', 'closing', 3)
  check('misma semilla, mismo partido', a.score.join() === b.score.join() && a.kicks.join() === b.kicks.join())
}

/* --- Los niveles están ordenados ----------------------------------------- */
{
  const pw = wins('peak', 'warmup', N)
  const cp = wins('closing', 'peak', N)
  const cw = wins('closing', 'warmup', N)
  check('Peak Time gana a Warm-up casi siempre', pw >= N * 0.7, `${pw}/${N}`)
  check('Closing gana a Peak Time casi siempre', cp >= N * 0.7, `${cp}/${N}`)
  check('Closing gana a Warm-up casi siempre', cw >= N * 0.85, `${cw}/${N}`)
}

/* --- Contra un rival quieto ---------------------------------------------- */
const perfectRate: Record<Level, number> = { warmup: 0, peak: 0, closing: 0 }
for (const level of LEVELS) {
  let scored = 0
  let own = 0
  let unfinished = 0
  let longestIdle = 0
  let kicks = 0
  let perfect = 0
  for (let k = 0; k < N; k++) {
    const r = play(null, level, k)
    scored += r.score[1]
    own += r.score[0]
    if (!r.ended) unfinished++
    longestIdle = Math.max(longestIdle, r.longestIdle)
    kicks += r.kicks[1]
    perfect += r.perfectKicks[1]
  }
  perfectRate[level] = perfect / Math.max(kicks, 1)
  check(`${level}: marca contra un rival quieto`, scored / N >= 2, `${(scored / N).toFixed(1)} goles por partido`)
  check(`${level}: casi no se mete goles en propia`, own / N <= 1.5, `${(own / N).toFixed(1)} por partido`)
  // Con el vinilo parado, la IA espera AI.STALL segundos y luego va a por él:
  // como mucho, lo que tarda en cruzar el campo a su velocidad. Más que eso es
  // una IA que no sabe llegar.
  const limit = AI.STALL + FIELD.W / (PLAYER.SPEED * AI[level].speed) + 1
  check(`${level}: nunca se queda mirando el vinilo`, longestIdle < limit, `máximo ${longestIdle.toFixed(1)} s parado (límite ${limit.toFixed(1)})`)
  check(`${level}: los partidos acaban`, unfinished === 0)
}

/* --- Los niveles altos rematan más al ritmo ------------------------------ */
{
  const pct = (l: Level) => `${Math.round(perfectRate[l] * 100)} %`
  const detail = `chutes PERFECT: Warm-up ${pct('warmup')}, Peak ${pct('peak')}, Closing ${pct('closing')}`
  check('cada nivel clava el beat más que el anterior', perfectRate.warmup < perfectRate.peak && perfectRate.peak < perfectRate.closing, detail)
  // La ventana PERFECT cubre un 32 % del tiempo: es lo que saca chutando al azar.
  check('Closing remata al ritmo bastante más que el azar', perfectRate.closing >= 0.5, detail)
}

console.log(failures === 0 ? '\n✔ IA: todo correcto' : `\n✘ IA: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
