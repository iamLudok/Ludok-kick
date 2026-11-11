import type { PowerKind } from '../game/types'
import type { Level } from '../types'

/** Nombres de los niveles tal como se enseñan. */
export const LEVEL_NAME: Record<Level, string> = {
  warmup: 'Warm-up',
  peak: 'Peak Time',
  closing: 'Closing',
}

export const LEVEL_HINT: Record<Level, string> = {
  warmup: 'Para calentar',
  peak: 'Un rival serio',
  closing: 'Clava el beat',
}

export const POWER_NAME: Record<PowerKind, string> = {
  scratch: 'Scratch',
  lowpass: 'Low-pass',
  loop: 'Loop',
  cue: 'Cue',
}

export const POWER_HINT: Record<PowerKind, string> = {
  scratch: 'tu próximo tiro hace curva',
  lowpass: 'el rival, a cámara lenta',
  loop: 'el vinilo se queda flotando',
  cue: 'vuelves a tu posición',
}
