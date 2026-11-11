import type { Engine } from './engine'
import { note, type Pattern } from './patterns'
import { bass, clap, hat, kick, stab } from './synth'

/** Cada cuánto se despierta el secuenciador y con cuánta antelación programa. */
const TICK_MS = 25
const LOOKAHEAD = 0.2

export type Sequencer = {
  /** Instante (reloj de audio) del primer beat. Los demás caen cada 60 / bpm segundos. */
  t0: number
  bpm: number
  /** Deja de programar notas nuevas; `resume` sigue donde lo dejó. */
  pause: () => void
  resume: () => void
  /** Para del todo y calla lo que ya estuviera programado. */
  stop: () => void
}

function playStep(e: Engine, p: Pattern, index: number, t: number, stepDur: number): void {
  const step = index % 16
  const bar = Math.floor(index / 16)
  const chord = p.chords[bar % p.chords.length]

  if (p.kick.includes(step)) kick(e, t)
  if (p.hat.includes(step)) hat(e, t, false)
  if (bar >= p.enter.hat16 && p.hat16.includes(step)) hat(e, t, false, 0.09)
  if (bar >= p.enter.hat16 && p.openHat.includes(step)) hat(e, t, true, 0.14)
  if (bar >= p.enter.clap && p.clap.includes(step)) clap(e, t)
  if (bar >= p.enter.bass && step in p.bass) bass(e, t, note(chord.root + p.bass[step]), stepDur * 0.9)
  if (bar >= p.enter.stab && p.stab.includes(step) && chord.notes.length > 0) {
    stab(e, t, chord.notes.map(note), stepDur * 3)
  }
}

/**
 * Arranca la base y la mantiene sonando.
 *
 * El temporizador de JavaScript NO decide cuándo suena nada: solo se despierta
 * cada 25 ms a programar las notas de los próximos 200 ms, cada una con su
 * instante exacto del reloj de audio. Si JavaScript se atasca un momento, las
 * notas ya programadas suenan igual de clavadas; con un `setInterval` que
 * disparase las notas directamente, cada tirón de la app se oiría como un
 * traspié en el ritmo, y rematar a tiempo sería una lotería.
 */
export function startSequencer(e: Engine, pattern: Pattern, bpm: number): Sequencer {
  const stepDur = 60 / bpm / 4
  // Un pequeño margen para que el primer bombo no nazca ya en el pasado.
  const t0 = e.ctx.currentTime + 0.3
  let next = 0
  let timer: ReturnType<typeof setInterval> | null = null

  // Cada base suena por su propio canal. Al parar se desconecta, y con él las
  // notas que ya estaban programadas: sin esto, al entrar en la pantalla
  // siguiente se colaban los últimos golpes de la anterior.
  const out = e.ctx.createGain()
  out.connect(e.music)
  const voices: Engine = { ...e, music: out }

  const tick = () => {
    const now = e.ctx.currentTime
    while (t0 + next * stepDur < now + LOOKAHEAD) {
      const t = t0 + next * stepDur
      // Si la app estuvo parada más que el margen, esas notas ya no se tocan:
      // tocarlas tarde y todas de golpe suena peor que un hueco.
      if (t >= now) playStep(voices, pattern, next, t, stepDur)
      next++
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

  resume()
  return {
    t0,
    bpm,
    pause,
    resume,
    stop: () => {
      pause()
      out.gain.value = 0
      out.disconnect()
    },
  }
}
