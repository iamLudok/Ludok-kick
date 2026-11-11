/**
 * La aritmética del beat. No sabe nada de audio: recibe tiempos en segundos y
 * devuelve distancias. Quién le da esos tiempos (el reloj de audio en el
 * móvil, un número inventado en las pruebas) no es asunto suyo.
 */
import { BEAT } from './constants'
import type { Judge } from './types'

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

export function judgeDelta(deltaSeconds: number): Judge {
  'worklet'
  const ms = Math.abs(deltaSeconds) * 1000
  if (ms <= BEAT.PERFECT_MS) return 2
  if (ms <= BEAT.GOOD_MS) return 1
  return 0
}

export function judgePower(judge: Judge): number {
  'worklet'
  return judge === 2 ? BEAT.PERFECT_POWER : judge === 1 ? BEAT.GOOD_POWER : 1
}
