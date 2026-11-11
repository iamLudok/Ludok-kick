/**
 * La aritmética del beat. No sabe nada de audio: recibe tiempos en segundos y
 * devuelve distancias. Quién le da esos tiempos (el reloj de audio en el
 * móvil, un número inventado en las pruebas) no es asunto suyo.
 */
import { BEAT } from './constants'
import type { Bar, Judge } from './types'

/** El tempo que toca según lo avanzado del partido (0 al empezar, 1 al acabar). */
export function tempoAt(progress: number): number {
  'worklet'
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress
  return Math.round(BEAT.BPM_START + (BEAT.BPM_END - BEAT.BPM_START) * p)
}

/** Cuánto más rápido va el juego a este tempo. */
export function speedAt(bpm: number): number {
  'worklet'
  return bpm / BEAT.BPM_START
}

/**
 * El compás que suena en `time`: el último que empezó antes. Los compases
 * vienen en orden y cada uno puede tener su tempo; como siempre empiezan en
 * un beat, contar beats desde el compás actual da los beats exactos aunque el
 * siguiente vaya más rápido. Devuelve null antes del primero.
 */
export function barAt(bars: Bar[], time: number): Bar | null {
  'worklet'
  let found: Bar | null = null
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].t0 <= time) found = bars[i]
    else break
  }
  return found
}

/** Segundos hasta el beat más cercano: negativo si aún no ha llegado, positivo si ya pasó. */
export function beatDelta(time: number, t0: number, bpm: number): number {
  'worklet'
  const period = 60 / bpm
  const beats = (time - t0) / period
  return (beats - Math.round(beats)) * period
}

/** En qué punto del compás se está: 0 justo en el beat, casi 1 justo antes del siguiente. */
export function beatPhase(time: number, t0: number, bpm: number): number {
  'worklet'
  const beats = (time - t0) / (60 / bpm)
  return beats - Math.floor(beats)
}

/**
 * Juicio de un toque a `deltaSeconds` del beat, con las ventanas encogidas a
 * este tempo. `timing` ensancha la ventana PERFECT (el DJ de minimal).
 */
export function judgeDelta(deltaSeconds: number, bpm: number, timing = 1): Judge {
  'worklet'
  const ms = Math.abs(deltaSeconds) * 1000 * speedAt(bpm)
  if (ms <= BEAT.PERFECT_MS * timing) return 2
  if (ms <= BEAT.GOOD_MS) return 1
  return 0
}

export function judgePower(judge: Judge): number {
  'worklet'
  return judge === 2 ? BEAT.PERFECT_POWER : judge === 1 ? BEAT.GOOD_POWER : 1
}
