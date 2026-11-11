import { FIELD } from '../game/constants'

/** Cómo se coloca el mundo (1000 × 450 u) dentro de la pantalla. */
export type View = {
  /** Tamaño de la pantalla en dp. */
  sw: number
  sh: number
  /** dp por unidad de mundo. */
  scale: number
  /** Esquina superior izquierda del mundo en la pantalla. */
  ox: number
  oy: number
}

export type Point = { x: number; y: number }

/** Dónde están los botones, en dp de pantalla. Lo comparten el dibujo y el táctil. */
export type ControlsLayout = {
  r: number
  left: Point
  right: Point
  jump: Point
  kick: Point
  /** El botón de poder, en el centro: algo más pequeño, se usa de vez en cuando. */
  power: Point
  powerR: number
}

/**
 * El campo entero tiene que verse siempre y medir lo mismo en todos los
 * móviles (si no, en uno más ancho habría más campo y sería otro juego). Se
 * escala hasta que quepa y se pega abajo: lo que sobre por arriba es más pared
 * y lo que sobre a los lados, decorado.
 *
 * `insetX` es el margen de la cámara o las esquinas redondeadas: se deja libre
 * por los dos lados para que las porterías no queden tapadas.
 */
export function fitWorld(sw: number, sh: number, insetX: number): View {
  const scale = Math.min((sw - insetX * 2) / FIELD.W, sh / FIELD.H)
  return {
    sw,
    sh,
    scale,
    ox: (sw - FIELD.W * scale) / 2,
    oy: sh - FIELD.H * scale,
  }
}

export function layoutControls(v: View, insetX: number): ControlsLayout {
  // Los botones viven en la franja de suelo que queda bajo el campo, para no
  // tapar el juego.
  const strip = (FIELD.H - FIELD.GROUND_Y) * v.scale
  const r = Math.max(30, Math.min(strip * 0.44, 52))
  const margin = Math.max(insetX, 8) + 10
  const y = v.sh - strip / 2
  const gap = r * 0.5
  return {
    r,
    left: { x: margin + r, y },
    right: { x: margin + r * 3 + gap, y },
    kick: { x: v.sw - margin - r, y },
    jump: { x: v.sw - margin - r * 3 - gap, y },
    power: { x: v.sw / 2, y },
    powerR: r * 0.85,
  }
}
