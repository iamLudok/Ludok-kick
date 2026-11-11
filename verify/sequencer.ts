/**
 * Prueba el secuenciador con un motor de audio de mentira que, en vez de
 * sonar, apunta qué se programa y para cuándo. Es la forma de comprobar en el
 * ordenador lo que en el móvil solo se oye: que el tempo sube compás a
 * compás, que el drop cae en un beat y que bombo y bajo callan durante la
 * subida y vuelven con el drop.
 */
import type { Engine } from '../src/audio/engine'
import { PROTOTYPE_PATTERN } from '../src/audio/patterns'
import { startSequencer } from '../src/audio/sequencer'
import { beatDelta, barAt } from '../src/game/beat'
import type { Bar } from '../src/game/types'

let failures = 0
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

/* --- El motor de mentira -------------------------------------------------- */

// Cada instrumento se reconoce por su primera automatización: el bombo arranca
// su tono en 150 Hz y el bajo abre su filtro en 900 Hz (ver `synth.ts`).
const kicks: number[] = []
const basses: number[] = []
const filter: { value: number; at: number }[] = []

function param(kind: string) {
  const p = {
    value: 0,
    setValueAtTime(v: number, t: number) {
      if (kind === 'frequency' && v === 150) kicks.push(t)
      if (kind === 'frequency' && v === 900) basses.push(t)
      return p
    },
    exponentialRampToValueAtTime: () => p,
    linearRampToValueAtTime: () => p,
    cancelScheduledValues: () => p,
  }
  return p
}
function node(): Record<string, unknown> {
  return {
    frequency: param('frequency'),
    detune: param('detune'),
    gain: param('gain'),
    Q: param('Q'),
    type: '',
    buffer: null,
    connect: () => undefined,
    disconnect: () => undefined,
    start: () => undefined,
    stop: () => undefined,
  }
}
const ctx = {
  currentTime: 0,
  sampleRate: 48000,
  createOscillator: node,
  createGain: node,
  createBiquadFilter: node,
  createBufferSource: node,
}
const musicFilter = node()
const freq = musicFilter.frequency as ReturnType<typeof param>
freq.setValueAtTime = (v: number, t: number) => {
  filter.push({ value: v, at: t })
  return freq
}
const engine = { ctx, music: node(), musicFilter, sfx: node(), noise: {} } as unknown as Engine

// El secuenciador se despierta con setInterval: aquí se le despierta a mano.
let wake: (() => void) | null = null
globalThis.setInterval = ((fn: () => void) => {
  wake = fn
  return 1
}) as unknown as typeof setInterval
globalThis.clearInterval = (() => undefined) as typeof clearInterval

function advance(to: number): void {
  while (ctx.currentTime < to) {
    ctx.currentTime = Math.min(to, ctx.currentTime + 0.025)
    wake?.()
  }
}

/* --- La prueba ------------------------------------------------------------ */

let bars: Bar[] = []
const allBars: Bar[] = []
let tempo = 120
const seq = startSequencer(engine, PROTOTYPE_PATTERN, {
  bpm: () => tempo,
  onBars: (b) => {
    bars = b
    allBars.push(b[b.length - 1])
  },
})

advance(6)
check('arranca a su tempo', allBars[0]?.bpm === 120)
const onBeat = (t: number) => {
  const bar = barAt(allBars, t + 1e-9)!
  return Math.abs(beatDelta(t, bar.t0, bar.bpm)) < 1e-6
}
check('los bombos caen en los beats', kicks.length > 8 && kicks.every(onBeat))
const gap = kicks[1] - kicks[0]
check('a 120 BPM, uno cada medio segundo', Math.abs(gap - 0.5) < 1e-6, `${gap.toFixed(4)} s`)

// El partido avanza: el tempo sube, pero solo al empezar un compás.
tempo = 140
const barsBefore = allBars.length
advance(10)
const newBars = allBars.slice(barsBefore)
check('el compás siguiente ya va al tempo nuevo', newBars[0]?.bpm === 140)
check('y empieza justo donde acaba el anterior', Math.abs(newBars[0].t0 - (allBars[barsBefore - 1].t0 + 2)) < 1e-6)
const lateKicks = kicks.filter((t) => t > newBars[1].t0)
check('a 140 BPM los bombos se aprietan', Math.abs(lateKicks[1] - lateKicks[0] - 60 / 140) < 1e-6)
check('y siguen en los beats', kicks.every(onBeat))

// Gol: el juego pide el drop a partir de dentro de 0,75 s.
const goalAt = ctx.currentTime
const at = seq.drop(goalAt + 0.75)
check('el drop cae al menos 0,75 s después', at >= goalAt + 0.75 - 1e-9, `${(at - goalAt).toFixed(3)} s`)
check('y no más tarde de un beat después', at < goalAt + 0.75 + 60 / 140 + 1e-9)
check('el drop cae en un beat', onBeat(at))
tempo = 145 // el partido sigue «avanzando» por detrás: no debe notarse hasta después del drop
advance(at + 3)
const buildKicks = kicks.filter((t) => t > goalAt + 0.25 && t < at - 1e-6)
const buildBass = basses.filter((t) => t > goalAt + 0.25 && t < at - 1e-6)
check('durante la subida no hay bombo', buildKicks.length === 0, `${buildKicks.length} bombos`)
check('ni bajo', buildBass.length === 0)
check('en el drop vuelve el bombo', kicks.some((t) => Math.abs(t - at) < 1e-6))
check('y el bajo después', basses.some((t) => t > at && t < at + 0.5))
const dropBar = allBars.find((b) => Math.abs(b.t0 - at) < 1e-6)
check('el drop empieza un compás nuevo', dropBar !== undefined)
// Durante la subida el tempo no puede cambiar: el instante del drop se
// calculó contando beats a ese tempo.
const buildBars = allBars.filter((b) => b.t0 > goalAt && b.t0 < at - 1e-6)
check('durante la subida el tempo se queda quieto', buildBars.every((b) => b.bpm === 140), buildBars.map((b) => b.bpm).join(', ') || 'ningún compás nuevo')
const closed = filter.find((f) => f.value === 20000 && Math.abs(f.at - at) < 1e-6)
check('el filtro se abre de golpe en el drop', closed !== undefined)
const after = allBars.filter((b) => b.t0 > at + 1e-6)
check('y después del drop el tempo sigue subiendo', after.length > 0 && after[0].bpm === 145)
check('los compases que se publican están en orden', bars.every((b, i) => i === 0 || b.t0 > bars[i - 1].t0))

// Segundo gol, justo al final de un compás: la subida cruza el cambio de
// compás, que es justo donde el tempo podría moverse. Es el caso peligroso:
// si el compás nuevo fuera más rápido, el beat del drop no existiría.
{
  const last = allBars[allBars.length - 1]
  const barLen = (60 / last.bpm) * 4
  const nextBar = last.t0 + Math.ceil((ctx.currentTime - last.t0) / barLen + 1) * barLen
  advance(nextBar - 0.35)
  const goal2 = ctx.currentTime
  const at2 = seq.drop(goal2 + 0.75)
  tempo = 150
  advance(at2 + 2)
  const crossed = allBars.filter((b) => b.t0 > goal2 && b.t0 < at2 - 1e-6)
  check('una subida que cruza de compás no cambia el tempo', crossed.length > 0 && crossed.every((b) => b.bpm === 145), crossed.map((b) => b.bpm).join(', ') || 'no cruzó')
  check('y el drop sigue cayendo en un beat, con su bombo', onBeat(at2) && kicks.some((t) => Math.abs(t - at2) < 1e-6))
  check('sin bombos durante esa subida', kicks.filter((t) => t > goal2 + 0.25 && t < at2 - 1e-6).length === 0)
}

// Low-pass: la música se amortigua, pero el bombo tiene que seguir sonando.
{
  const from = ctx.currentTime
  seq.muffle(3)
  advance(from + 3)
  const during = kicks.filter((t) => t > from + 0.25 && t < from + 3)
  check('bajo un Low-pass el bombo sigue sonando', during.length >= 4, `${during.length} bombos en 3 s`)
}

seq.stop()
console.log(failures === 0 ? '\n✔ secuenciador: todo correcto' : `\n✘ secuenciador: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
