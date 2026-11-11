/**
 * Prueba el remate al ritmo con el mismo código que corre en el móvil. Aquí el
 * «reloj de audio» es un número que pone la propia prueba: lo que se comprueba
 * es la cuenta (a qué distancia del beat cae un toque y qué premio le toca),
 * no el sonido.
 */
import { beatDelta, beatPhase, judgeDelta } from '../src/game/beat'
import { BALL, BEAT, FIELD, MATCH } from '../src/game/constants'
import { createInitialState, emptyInput } from '../src/game/state'
import { stepGame } from '../src/game/step'
import type { GameEvent, GameState, InputFrame } from '../src/game/types'

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

  check('dentro de la ventana PERFECT', judgeDelta(BEAT.PERFECT_MS / 1000 - 0.001) === 2)
  check('adelantarse cuenta igual que atrasarse', judgeDelta(-(BEAT.PERFECT_MS / 1000 - 0.001)) === 2)
  check('entre PERFECT y GOOD es GOOD', judgeDelta((BEAT.PERFECT_MS + 1) / 1000) === 1 && judgeDelta((BEAT.GOOD_MS - 1) / 1000) === 1)
  check('fuera de la ventana es un tiro normal', judgeDelta((BEAT.GOOD_MS + 1) / 1000) === 0)
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
    const beat = offsetMs === null ? undefined : { time: 100 + i / 60, t0, bpm: BEAT.BPM }
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

console.log(failures === 0 ? '\n✔ beat: todo correcto' : `\n✘ beat: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
