/**
 * Los sonidos de la interfaz: un clic al pulsar, otro al elegir. Encienden el
 * audio un momento y lo vuelven a soltar, para no tenerlo encendido sin
 * necesidad mientras se está en los menús.
 */
import { getEngine, holdEngine, releaseEngine } from './engine'
import { uiSfx, type UiSound } from './synth'

const HOLD_MS = 1500

export function playUi(kind: UiSound): void {
  try {
    const e = getEngine()
    void holdEngine()
    uiSfx(e, kind)
    setTimeout(() => void releaseEngine(), HOLD_MS)
  } catch {
    // Sin audio, la interfaz funciona igual: un clic que no suena no es motivo
    // para romper un botón.
  }
}
