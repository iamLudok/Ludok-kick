/**
 * Prueba el remate al ritmo con el mismo código que corre en el móvil. Aquí el
 * «reloj de audio» es un número que pone la propia prueba: lo que se comprueba
 * es la cuenta (a qué distancia del beat cae un toque y qué premio le toca),
 * no el sonido.
 */
import { barAt, beatDelta, beatPhase, judgeDelta } from '../src/game/beat'
import { BALL, BEAT, FIELD, GOAL, MATCH, PLAYER, SHOCK } from '../src/game/constants'
import { createInitialState, emptyInput } from '../src/game/state'
import { stepGame } from '../src/game/step'
import type { GameEvent, GameState, InputFrame, Phase } from '../src/game/types'

let failures = 0

function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

/* --- La cuenta ----------------------------------------------------------- */
{
  // A 120 BPM hay un beat cada 0,5 s. Con t0 = 10 caen en 10, 10,5, 11…
  check('justo en el beat la distancia es 0', near(beatDelta(10.5, 10, 120), 0))
  check('un poco después es positiva', near(beatDelta(10.56, 10, 120), 0.06))
  check('un poco antes es negativa', near(beatDelta(10.44, 10, 120), -0.06))
  check('a mitad de camino está a medio beat', near(Math.abs(beatDelta(10.25, 10, 120)), 0.25))
  check('funciona antes de t0', near(beatDelta(9.47, 10, 120), -0.03))
  check('la fase va de 0 a 1', near(beatPhase(10.5, 10, 120), 0) && near(beatPhase(10.875, 10, 120), 0.75))
  check('otro tempo, otro periodo', near(beatDelta(10.4, 10, 150), 0))

  const B = BEAT.REFERENCE_BPM
  check('dentro de la ventana PERFECT', judgeDelta(BEAT.PERFECT_MS / 1000 - 0.001, B) === 2)
  check('adelantarse cuenta igual que atrasarse', judgeDelta(-(BEAT.PERFECT_MS / 1000 - 0.001), B) === 2)
  check('entre PERFECT y GOOD es GOOD', judgeDelta((BEAT.PERFECT_MS + 1) / 1000, B) === 1 && judgeDelta((BEAT.GOOD_MS - 1) / 1000, B) === 1)
  check('fuera de la ventana es un tiro normal', judgeDelta((BEAT.GOOD_MS + 1) / 1000, B) === 0)
}

/* --- Cada tempo, sus ventanas -------------------------------------------- */
{
  // A más tempo, la ventana en milisegundos se encoge en la misma proporción:
  // siempre es la misma fracción del beat, sea house a 122 o techno a 145.
  const fast = 145
  const perfectAtFast = (BEAT.PERFECT_MS * BEAT.REFERENCE_BPM) / fast
  check('a más tempo la ventana PERFECT se encoge', judgeDelta((perfectAtFast - 1) / 1000, fast) === 2 && judgeDelta((perfectAtFast + 1) / 1000, fast) === 1, `${perfectAtFast.toFixed(1)} ms a ${fast} BPM`)
  check('lo que a 120 era PERFECT por los pelos, a 145 ya no', judgeDelta((BEAT.PERFECT_MS - 1) / 1000, fast) === 1)
  const slow = 100
  check('y a menos tempo se ensancha', judgeDelta((BEAT.PERFECT_MS + 10) / 1000, slow) === 2)

  // Compases con tempos distintos: se cuenta desde el compás que suena.
  const bars = [
    { t0: 10, bpm: 120 },
    { t0: 12, bpm: 140 },
  ]
  check('antes del primer compás no hay compás', barAt(bars, 9) === null)
  check('dentro de un compás, ese compás', barAt(bars, 11.9)?.bpm === 120 && barAt(bars, 12)?.bpm === 140)
  const bar = barAt(bars, 12.43)!
  check('los beats del compás nuevo caen a su tempo', near(beatDelta(12 + 60 / 140, bar.t0, bar.bpm), 0))
  check('y el cambio de compás es un beat', near(beatDelta(12.001, barAt(bars, 12.001)!.t0, 140), 0.001) && near(beatDelta(11.999, barAt(bars, 11.999)!.t0, 120), -0.001))
}

/* --- En el partido ------------------------------------------------------- */

const IDLE = emptyInput()
const KICK: InputFrame = { ...emptyInput(), kick: true }

/**
 * Coloca el vinilo delante del jugador y chuta, con el reloj de audio puesto
 * para que el contacto caiga a `offsetMs` del beat. Devuelve el toque.
 */
function kickAt(offsetMs: number | null): { event: Extract<GameEvent, { type: 'kick' | 'head' }>; s: GameState } {
  // Primero se mide cuánto tarda el pie en llegar al vinilo, sin música.
  const probe = createInitialState()
  const setup = (s: GameState) => {
    for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, 1 / 60)
    s.ball.x = s.players[0].x + 50
    s.ball.y = FIELD.GROUND_Y - BALL.R
    s.ball.vx = 0
    s.ball.vy = 0
  }
  setup(probe)
  // Se avanza de paso en paso (1/120 s) para saber en cuál exactamente toca el
  // pie: a 60 Hz caben dos pasos por frame y no se sabría en cuál de los dos fue.
  const startTick = probe.tick
  let contactTick = 0
  for (let i = 0; i < 60 && !contactTick; i++) {
    stepGame(probe, KICK, IDLE, 1 / 120)
    if (probe.events.some((e) => e.type === 'kick')) contactTick = probe.tick - startTick
  }

  // Y ahora de verdad, a 60 Hz. El paso n del frame acaba en 100 + n / 120.
  const s = createInitialState()
  setup(s)
  const contactTime = 100 + contactTick / 120
  const t0 = offsetMs === null ? 0 : contactTime - offsetMs / 1000
  for (let i = 1; i <= 30; i++) {
    const beat = offsetMs === null ? undefined : { time: 100 + i / 60, t0, bpm: BEAT.REFERENCE_BPM, dropAt: -1 }
    stepGame(s, KICK, IDLE, 1 / 60, beat)
    const e = s.events.find((ev) => ev.type === 'kick')
    if (e && e.type === 'kick') return { event: e, s }
  }
  throw new Error('el chut no llegó al vinilo')
}

{
  // `kickAt` deja correr un segundo antes de chutar: tiene que bastar para salir del saque.
  check('tras un segundo ya se está jugando', MATCH.KICKOFF_DELAY < 1)

  const normal = kickAt(null)
  check('sin música, el chut es normal', normal.event.judge === 0)

  const perfect = kickAt(0)
  check('un chut justo en el beat es PERFECT', perfect.event.judge === 2)
  // Se compara la velocidad horizontal: a la vertical ya le ha sumado algo la
  // gravedad en lo que quedaba de frame, y la proporción deja de ser exacta.
  const ratio = perfect.s.ball.vx / normal.s.ball.vx
  check('y sale con la potencia de PERFECT', near(ratio, BEAT.PERFECT_POWER, 1e-6), `×${ratio.toFixed(3)}`)

  check('a 60 ms del beat sigue siendo PERFECT', kickAt(60).event.judge === 2 && kickAt(-60).event.judge === 2)

  const good = kickAt(120)
  check('a 120 ms es GOOD', good.event.judge === 1)
  check('y sale con la potencia de GOOD', near(good.s.ball.vx / normal.s.ball.vx, BEAT.GOOD_POWER, 1e-6))

  const off = kickAt(240)
  check('a 240 ms es un tiro normal', off.event.judge === 0 && near(off.s.ball.vx, normal.s.ball.vx, 1e-6))

  check('el toque dice dónde estaba el vinilo', perfect.event.x > 0 && perfect.event.y > 0)
}

/* --- El instante se juzga por paso, no por frame ------------------------- */
{
  // Mismo toque, mismo instante de audio, pintando a 60 y a 120 Hz: tiene que
  // dar el mismo juicio aunque en un caso el frame acabe 8 ms más tarde.
  const edge = BEAT.PERFECT_MS - 3
  check('el juicio en el borde de la ventana no depende de los fps', kickAt(edge).event.judge === 2 && kickAt(edge + 6).event.judge === 1)
}

/* --- El tempo no cambia la velocidad del juego -------------------------- */
{
  const at = (bpm: number) => {
    const s = createInitialState()
    let t = 0
    for (let i = 0; i < 60 * 3; i++) {
      t += 1 / 60
      stepGame(s, IDLE, IDLE, 1 / 60, { time: t, t0: 0, bpm, dropAt: -1 })
    }
    return s
  }
  const slow = at(122)
  const fast = at(145)
  check('a cualquier tempo el juego va igual de rápido', slow.tick === fast.tick && JSON.stringify(slow.ball) === JSON.stringify(fast.ball))
  check('y el reloj del partido marca segundos de verdad', near(slow.timeLeft, MATCH.DURATION - 3 + MATCH.KICKOFF_DELAY, 0.02), slow.timeLeft.toFixed(3))
}

/* --- El drop cae cuando dice la música ----------------------------------- */
{
  // Un gol, y la música dice que el drop cae en `dropAt`.
  const s = createInitialState()
  let t = 0
  const beat = { time: 0, t0: 0, bpm: BEAT.REFERENCE_BPM, dropAt: -1 }
  const frame = (n: number) => {
    for (let i = 0; i < n; i++) {
      t += 1 / 60
      beat.time = t
      stepGame(s, IDLE, IDLE, 1 / 60, beat)
      for (const e of s.events) events.push({ ...e, t })
    }
  }
  const events: ({ t: number } & GameEvent)[] = []
  frame(60)
  s.players[0].x = 400
  s.players[1].x = FIELD.W - 300
  s.ball.x = FIELD.W - 160
  s.ball.y = FIELD.GROUND_Y - BALL.R
  s.ball.vx = 700
  frame(30)
  const goal = events.find((e) => e.type === 'goal')
  check('el gol dice cuándo se marcó, en tiempo de audio', goal !== undefined && goal.type === 'goal' && goal.at > 0)
  frame(30)
  check('mientras la música no dice cuándo, sigue congelado', s.phase === 'goal')
  beat.dropAt = t + 0.5
  frame(20)
  // `as Phase`: TypeScript da por hecho que `s.phase` no ha cambiado desde la
  // comprobación de arriba, pero `frame` lo cambia por dentro.
  check('antes del instante del drop, congelado', (s.phase as Phase) === 'goal')
  frame(15)
  const drop = events.find((e) => e.type === 'drop')
  check('el drop cae en su instante, al frame', drop !== undefined && Math.abs(drop.t - beat.dropAt) <= 1 / 60 + 1e-9, drop ? `${((drop.t - beat.dropAt) * 1000).toFixed(1)} ms` : 'no cayó')
  check('la onda lanza por los aires al que encajó', s.players[1].vy < 0 && s.players[1].vx > 0, `v=(${s.players[1].vx.toFixed(0)}, ${s.players[1].vy.toFixed(0)})`)
  check('y sale desde quien marcó', drop?.type === 'drop' && drop.side === 0 && Math.abs(drop.x - s.players[0].x) < 20)
  const before = s.players[0].x
  frame(10)
  check('tras el drop nadie controla a su jugador', Math.abs(s.players[0].x - before) < 1)
  frame(Math.ceil(MATCH.DROP_AFTER * 60))
  check('y luego se saca', s.phase === 'kickoff' || s.phase === 'play')

  // Si la música no contesta nunca, el partido no se queda colgado.
  const stuck = createInitialState()
  stuck.phase = 'goal'
  stuck.phaseT = 0
  let tt = 0
  for (let i = 0; i < 60 * (MATCH.MAX_FREEZE + 0.1); i++) {
    tt += 1 / 60
    stepGame(stuck, IDLE, IDLE, 1 / 60, { time: tt, t0: 0, bpm: BEAT.REFERENCE_BPM, dropAt: -1 })
  }
  check('sin respuesta de la música, el drop cae igual al rato', (stuck.phase as Phase) === 'drop')
  check('las constantes de la onda tienen sentido', SHOCK.PUSH_X > 0 && SHOCK.PUSH_Y > 0 && GOAL.HEIGHT > PLAYER.HEAD_R)
}

console.log(failures === 0 ? '\n✔ beat: todo correcto' : `\n✘ beat: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
