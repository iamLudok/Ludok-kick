/**
 * El reloj de audio, visto desde el hilo del juego.
 *
 * La única fuente de verdad del ritmo es el contador de muestras del propio
 * audio (`currentTime`). Pero ese contador no avanza de forma continua: salta
 * de golpe cada vez que el móvil pide otro bloque de sonido, cada varios
 * milisegundos. Leído tal cual, dos frames seguidos podían ver el mismo
 * instante y el siguiente un salto doble.
 *
 * Por eso se usa el reloj del sistema solo para RELLENAR entre salto y salto:
 * se mantiene la diferencia entre los dos relojes, suavizada, y la hora de
 * audio es «reloj del sistema + diferencia». Manda el audio; el del sistema
 * solo interpola. Si el audio se para o da un salto grande (pausa, cambio de
 * auriculares), la diferencia se vuelve a tomar de cero.
 */

/** Lo único que el juego necesita del motor de audio. */
export type ClockSource = { readonly currentTime: number }

export type AudioClock = {
  /** Reloj de audio menos reloj del sistema, en segundos. */
  offset: number
  synced: boolean
}

const SMOOTHING = 0.05
const RESYNC_AFTER = 0.1

export function createAudioClock(): AudioClock {
  'worklet'
  return { offset: 0, synced: false }
}

/** Hora del reloj de audio ahora mismo, en segundos. Hay que llamarla una vez por frame. */
export function readAudioClock(source: ClockSource, clock: AudioClock): number {
  'worklet'
  const system = performance.now() / 1000
  const target = source.currentTime - system
  if (!clock.synced || Math.abs(target - clock.offset) > RESYNC_AFTER) {
    clock.offset = target
    clock.synced = true
  } else {
    clock.offset += (target - clock.offset) * SMOOTHING
  }
  return system + clock.offset
}
