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
  stomp: 'Bombo',
  hype: 'Manos arriba',
  robot: 'Modo robot',
  bighead: 'Cabeza gigante',
  cloud: 'Nube',
  wall: 'Muro',
  laser: 'Rayo',
  lowpass: 'Low-pass',
  loop: 'Loop',
  moon: 'Luna',
  wings: 'Alas',
  jester: 'Bufón',
  blackout: 'Apagón',
}

export const POWER_HINT: Record<PowerKind, string> = {
  scratch: 'tu próximo tiro hace curva',
  stomp: 'pisotón que lanza al rival y despeja el vinilo',
  hype: 'saltas muchísimo más durante 5 s',
  robot: 'el rival se queda congelado',
  bighead: 'tu cabeza crece durante 5 s',
  cloud: 'el vinilo se vuelve ligero y botón',
  wall: 'un bafle tapa tu portería 4 s',
  laser: 'tu próximo tiro sale recto y rapidísimo',
  lowpass: 'el rival, a cámara lenta',
  loop: 'el vinilo se queda flotando',
  moon: 'gravedad baja para todos',
  wings: 'planeas y tienes doble salto 7 s',
  jester: 'al rival se le cambian izquierda y derecha 2 s',
  blackout: 'el rival se queda sin energía ni poderes',
}

/**
 * El color con el que se escribe el nombre de un DJ: el de su camiseta, salvo
 * que sea tan oscura que sobre el fondo de la app no se leería (los DJs que
 * visten de negro), y entonces el color de texto normal.
 */
export function djNameColor(jersey: string, fallback: string): string {
  const hex = jersey.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance < 0.18 ? fallback : jersey
}
