import type { Bar } from '../game/types'
import type { Engine } from './engine'
import { note, type Pattern } from './patterns'
import { bass, clap, hat, impact, kick, riser, stab } from './synth'

/** Cada cuánto se despierta el secuenciador y con cuánta antelación programa. */
const TICK_MS = 25
const LOOKAHEAD = 0.2
/** Compases que se guardan hacia atrás: lo que se oye va retrasado respecto a lo que se programa. */
const BARS_KEPT = 4
/** Frecuencia a la que cierra el filtro antes del drop, y abierto del todo. */
const FILTER_CLOSED = 320
const FILTER_OPEN = 20000

export type Sequencer = {
  /** Deja de programar notas nuevas; `resume` sigue donde lo dejó. */
  pause: () => void
  resume: () => void
  /** Para del todo y calla lo que ya estuviera programado. */
  stop: () => void
  /**
   * Prepara un drop: cierra la música, sube la tensión y la suelta de golpe
   * en el primer beat a partir de `from` (reloj de audio). Devuelve ese
   * instante, o -1 si no está sonando.
   */
  drop: (from: number) => number
  /** Vuelve a la intro: la canción se monta otra vez desde el bombo solo. */
  restart: () => void
}

type Options = {
  /** El tempo del siguiente compás. Se pregunta al empezar cada uno. */
  bpm: () => number
  /** Recibe los compases programados cada vez que empieza uno nuevo. */
  onBars: (bars: Bar[]) => void
}

/**
 * Arranca la base y la mantiene sonando, compás a compás.
 *
 * El temporizador de JavaScript NO decide cuándo suena nada: solo se despierta
 * cada 25 ms a programar las notas de los próximos 200 ms, cada una con su
 * instante exacto del reloj de audio. Si JavaScript se atasca un momento, las
 * notas ya programadas suenan igual de clavadas; con un `setInterval` que
 * disparase las notas directamente, cada tirón de la app se oiría como un
 * traspié en el ritmo, y rematar a tiempo sería una lotería.
 *
 * El tempo solo cambia al empezar un compás, y cada compás empieza en un beat:
 * así el juego puede contar beats desde el compás que suena sin errores.
 */
export function startSequencer(e: Engine, pattern: Pattern, opts: Options): Sequencer {
  let timer: ReturnType<typeof setInterval> | null = null

  // Cada base suena por su propio canal. Al parar se desconecta, y con él las
  // notas que ya estaban programadas: sin esto, al entrar en la pantalla
  // siguiente se colaban los últimos golpes de la anterior.
  const out = e.ctx.createGain()
  out.connect(e.music)
  const voices: Engine = { ...e, music: out }

  // Dónde va el secuenciador: el próximo paso a programar.
  let nextT = e.ctx.currentTime + 0.3 // un margen para que el primer bombo no nazca en el pasado
  let step = 0 // 0–15 dentro del compás
  let bar = 0 // compases desde la intro, para las capas
  let stepDur = 0
  let bars: Bar[] = []
  /** Desde que se marca un gol hasta que cae el drop no suenan ni bombo ni bajo. */
  let buildFrom = -1
  let dropAt = -1
  /** Tras el primer drop la canción va entera. */
  let full = false

  const startBar = (t: number) => {
    // Mientras se prepara un drop el tempo no se mueve: el instante del drop se
    // calculó contando beats a este tempo, y tiene que caer donde se dijo.
    const bpm = dropAt >= 0 && bars.length > 0 ? bars[bars.length - 1].bpm : opts.bpm()
    stepDur = 60 / bpm / 4
    bars = [...bars.slice(-(BARS_KEPT - 1)), { t0: t, bpm }]
    opts.onBars(bars)
  }

  const playStep = (t: number) => {
    const p = pattern
    const chord = p.chords[bar % p.chords.length]
    const on = (layer: keyof Pattern['enter']) => full || bar >= p.enter[layer]
    const building = buildFrom >= 0 && t >= buildFrom - 1e-6 && (dropAt < 0 || t < dropAt - 1e-6)

    if (p.kick.includes(step) && !building) kick(voices, t)
    if (p.hat.includes(step)) hat(voices, t, false)
    if (on('hat16') && p.hat16.includes(step)) hat(voices, t, false, 0.09)
    if (on('hat16') && p.openHat.includes(step)) hat(voices, t, true, 0.14)
    if (on('clap') && p.clap.includes(step)) clap(voices, t)
    if (on('bass') && step in p.bass && !building) bass(voices, t, note(chord.root + p.bass[step]), stepDur * 0.9)
    if (on('stab') && p.stab.includes(step) && chord.notes.length > 0) {
      stab(voices, t, chord.notes.map(note), stepDur * 3)
    }
  }

  const tick = () => {
    const now = e.ctx.currentTime
    while (nextT < now + LOOKAHEAD) {
      // El drop vuelve a empezar la frase: ese beat es el primero de un compás.
      // «A partir de» y no «justo en»: si por lo que fuera el paso exacto no
      // existiera, con una comparación exacta el drop no llegaba nunca y el
      // bombo se quedaba callado el resto del partido.
      if (dropAt >= 0 && nextT >= dropAt - 1e-4) {
        step = 0
        bar = Math.max(bar, 1)
        full = true
        buildFrom = -1
        dropAt = -1
      }
      if (step === 0) startBar(nextT)
      // Si la app estuvo parada más que el margen, esas notas ya no se tocan:
      // tocarlas tarde y todas de golpe suena peor que un hueco.
      if (nextT >= now) playStep(nextT)
      nextT += stepDur
      step = (step + 1) % 16
      if (step === 0) bar++
    }
  }

  const pause = () => {
    if (timer) clearInterval(timer)
    timer = null
  }
  const resume = () => {
    if (timer) return
    tick()
    timer = setInterval(tick, TICK_MS)
  }

  const drop = (from: number): number => {
    if (!timer) return -1
    const now = e.ctx.currentTime
    // El primer beat a partir de `from`, contando en el compás que se está
    // programando. Mientras dura la congelación el partido no avanza, así que
    // el tempo no cambia y los beats siguientes caen a este mismo paso.
    const beat = stepDur * 4
    const current = bars[bars.length - 1]
    if (!current) return -1
    // Tiene que caer en un paso que aún no se haya programado.
    const earliest = Math.max(from, now + LOOKAHEAD + 0.02, nextT)
    const at = current.t0 + Math.ceil((earliest - current.t0) / beat - 1e-6) * beat
    buildFrom = nextT
    dropAt = at

    const f = e.musicFilter.frequency
    f.cancelScheduledValues(now)
    f.setValueAtTime(FILTER_OPEN, now)
    f.exponentialRampToValueAtTime(FILTER_CLOSED, at - 0.02)
    f.setValueAtTime(FILTER_OPEN, at)
    riser(voices, now, at)
    impact(voices, at)
    return at
  }

  const restart = () => {
    bar = 0
    full = false
  }

  resume()
  return {
    pause,
    resume,
    drop,
    restart,
    stop: () => {
      pause()
      out.gain.value = 0
      out.disconnect()
      const f = e.musicFilter.frequency
      f.cancelScheduledValues(0)
      f.value = FILTER_OPEN
    },
  }
}
