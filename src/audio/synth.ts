/**
 * Los instrumentos. Cada función programa UN golpe para un instante exacto del
 * reloj de audio (`t`, en segundos): crea sus nodos, les pone la envolvente y
 * los deja morir solos al acabar.
 *
 * Las envolventes usan rampas exponenciales, que no pueden llegar a 0: por eso
 * el «silencio» es siempre 0.001.
 */
import type { Engine } from './engine'
import type { Judge } from '../game/types'

const SILENCE = 0.001

function noiseBurst(e: Engine, t: number, dur: number): ReturnType<Engine['ctx']['createBufferSource']> {
  const src = e.ctx.createBufferSource()
  src.buffer = e.noise
  src.start(t)
  src.stop(t + dur + 0.02)
  return src
}

export function kick(e: Engine, t: number, level = 1): void {
  const osc = e.ctx.createOscillator()
  const amp = e.ctx.createGain()
  osc.type = 'sine'
  // El «bum» es un tono que cae en picado: de 150 Hz a 45 en menos de una décima.
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.09)
  amp.gain.setValueAtTime(level, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + 0.3)
  osc.connect(amp)
  amp.connect(e.music)
  osc.start(t)
  osc.stop(t + 0.32)
}

export function hat(e: Engine, t: number, open: boolean, level = 0.2): void {
  const dur = open ? 0.2 : 0.045
  const src = noiseBurst(e, t, dur)
  const hp = e.ctx.createBiquadFilter()
  const amp = e.ctx.createGain()
  hp.type = 'highpass'
  hp.frequency.value = 7500
  amp.gain.setValueAtTime(level, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + dur)
  src.connect(hp)
  hp.connect(amp)
  amp.connect(e.music)
}

export function clap(e: Engine, t: number, level = 0.32): void {
  const src = noiseBurst(e, t, 0.22)
  const bp = e.ctx.createBiquadFilter()
  const amp = e.ctx.createGain()
  bp.type = 'bandpass'
  bp.frequency.value = 1600
  bp.Q.value = 0.9
  // Tres ráfagas muy seguidas y luego la cola: es lo que distingue una palmada
  // de un simple golpe de ruido.
  amp.gain.setValueAtTime(SILENCE, t)
  for (const d of [0, 0.011, 0.022]) {
    amp.gain.setValueAtTime(level, t + d)
    amp.gain.exponentialRampToValueAtTime(level * 0.25, t + d + 0.009)
  }
  amp.gain.setValueAtTime(level, t + 0.033)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + 0.2)
  src.connect(bp)
  bp.connect(amp)
  amp.connect(e.music)
}

export function bass(e: Engine, t: number, freq: number, dur: number, level = 0.4): void {
  const osc = e.ctx.createOscillator()
  const lp = e.ctx.createBiquadFilter()
  const amp = e.ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.value = freq
  lp.type = 'lowpass'
  lp.Q.value = 4
  lp.frequency.setValueAtTime(900, t)
  lp.frequency.exponentialRampToValueAtTime(180, t + dur)
  amp.gain.setValueAtTime(SILENCE, t)
  amp.gain.exponentialRampToValueAtTime(level, t + 0.006)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + dur)
  osc.connect(lp)
  lp.connect(amp)
  amp.connect(e.music)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export function stab(e: Engine, t: number, freqs: number[], dur: number, level = 0.09): void {
  const lp = e.ctx.createBiquadFilter()
  const amp = e.ctx.createGain()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(2600, t)
  lp.frequency.exponentialRampToValueAtTime(500, t + dur)
  amp.gain.setValueAtTime(level, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + dur)
  lp.connect(amp)
  amp.connect(e.music)
  for (const f of freqs) {
    // Dos sierras un pelín desafinadas por nota: suena ancho en vez de a pitido.
    for (const detune of [-7, 7]) {
      const osc = e.ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = f
      osc.detune.value = detune
      osc.connect(lp)
      osc.start(t)
      osc.stop(t + dur + 0.02)
    }
  }
}

/* --- Efectos: suenan «ya», no en un instante programado ------------------ */

function blip(e: Engine, t: number, from: number, to: number, dur: number, level: number, type: 'sine' | 'triangle' | 'square'): void {
  const osc = e.ctx.createOscillator()
  const amp = e.ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  amp.gain.setValueAtTime(level, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + dur)
  osc.connect(amp)
  amp.connect(e.sfx)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** El golpe al vinilo. Cuanto mejor el juicio, más brillante suena. */
export function hitSfx(e: Engine, judge: Judge): void {
  const t = e.ctx.currentTime
  const src = noiseBurst(e, t, 0.05)
  const bp = e.ctx.createBiquadFilter()
  const amp = e.ctx.createGain()
  bp.type = 'bandpass'
  bp.frequency.value = 900
  amp.gain.setValueAtTime(0.5, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + 0.05)
  src.connect(bp)
  bp.connect(amp)
  amp.connect(e.sfx)
  blip(e, t, 240, 110, 0.07, 0.4, 'sine')

  if (judge === 1) blip(e, t, 660, 660, 0.09, 0.22, 'triangle')
  if (judge === 2) {
    // Dos notas a una quinta, la segunda un instante después: un «¡tin-tin!».
    blip(e, t, 880, 880, 0.12, 0.28, 'triangle')
    blip(e, t + 0.05, 1320, 1320, 0.2, 0.28, 'triangle')
  }
}

export function goalSfx(e: Engine): void {
  const t = e.ctx.currentTime
  blip(e, t, 220, 880, 0.35, 0.3, 'square')
  blip(e, t + 0.12, 330, 1320, 0.4, 0.2, 'square')
  const src = noiseBurst(e, t, 0.5)
  const amp = e.ctx.createGain()
  amp.gain.setValueAtTime(0.25, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + 0.5)
  src.connect(amp)
  amp.connect(e.sfx)
}

/* --- El drop ------------------------------------------------------------- */

/**
 * La subida antes del drop: ruido que se abre hacia agudos y crece, de `t` a
 * `end`. Va por el bus de efectos, no por el de música: así no se lo come el
 * filtro que cierra la música a la vez.
 */
export function riser(e: Engine, t: number, end: number): void {
  const dur = end - t
  if (dur <= 0.05) return
  const src = noiseBurst(e, t, dur)
  const bp = e.ctx.createBiquadFilter()
  const amp = e.ctx.createGain()
  bp.type = 'bandpass'
  bp.Q.value = 2.5
  bp.frequency.setValueAtTime(400, t)
  bp.frequency.exponentialRampToValueAtTime(6000, end)
  amp.gain.setValueAtTime(SILENCE, t)
  amp.gain.exponentialRampToValueAtTime(0.32, end - 0.01)
  amp.gain.setValueAtTime(SILENCE, end)
  src.connect(bp)
  bp.connect(amp)
  amp.connect(e.sfx)
}

/** El golpe del drop: un sub que cae en picado y un platillo largo. */
export function impact(e: Engine, t: number): void {
  const osc = e.ctx.createOscillator()
  const amp = e.ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, t)
  osc.frequency.exponentialRampToValueAtTime(32, t + 0.6)
  amp.gain.setValueAtTime(0.95, t)
  amp.gain.exponentialRampToValueAtTime(SILENCE, t + 1.1)
  osc.connect(amp)
  amp.connect(e.sfx)
  osc.start(t)
  osc.stop(t + 1.15)

  const src = noiseBurst(e, t, 1.4)
  const hp = e.ctx.createBiquadFilter()
  const camp = e.ctx.createGain()
  hp.type = 'highpass'
  hp.frequency.value = 4000
  camp.gain.setValueAtTime(0.28, t)
  camp.gain.exponentialRampToValueAtTime(SILENCE, t + 1.4)
  src.connect(hp)
  hp.connect(camp)
  camp.connect(e.sfx)
}
