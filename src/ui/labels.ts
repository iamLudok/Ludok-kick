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
