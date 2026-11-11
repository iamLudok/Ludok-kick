/**
 * Cómo se dibuja cada DJ. La cabeza va aparte del cuerpo porque se usa en dos
 * sitios: en el partido y en los retratos de la selección.
 *
 * Lo que hace reconocible a cada uno es la silueta (el peinado, el casco, la
 * máscara) y no la cara: en una pantalla pequeña y con todo moviéndose, los
 * detalles finos no se leen, y dos muñecos que solo cambian de color se
 * confunden.
 *
 * Todo se dibuja mirando a la derecha alrededor del centro de la cabeza; para
 * el que mira a la izquierda se da la vuelta al lienzo. Así cada peinado y
 * cada máscara se escriben una sola vez.
 */
import { ClipOp, PaintStyle, Skia, StrokeCap, type SkCanvas, type SkPaint } from '@shopify/react-native-skia'
import { PLAYER } from '../game/constants'
import type { DjLook } from '../content/djs'

export type DjPaints = {
  look: DjLook
  jersey: SkPaint
  leg: SkPaint
  skin: SkPaint
  hair: SkPaint
  accent: SkPaint
  accentStroke: SkPaint
  outline: SkPaint
  thinOutline: SkPaint
  white: SkPaint
  dark: SkPaint
  brow: SkPaint
  shine: SkPaint
  gold: SkPaint
  goldStroke: SkPaint
  red: SkPaint
  mouseHead: SkPaint
}

function fill(color: string, alpha = 1): SkPaint {
  const p = Skia.Paint()
  p.setAntiAlias(true)
  p.setColor(Skia.Color(color))
  p.setAlphaf(alpha)
  return p
}

function stroke(color: string, width: number, alpha = 1): SkPaint {
  const p = fill(color, alpha)
  p.setStyle(PaintStyle.Stroke)
  p.setStrokeWidth(width)
  p.setStrokeCap(StrokeCap.Round)
  return p
}

export function createDjPaints(look: DjLook, outlineColor: string): DjPaints {
  return {
    look,
    jersey: fill(look.jersey),
    leg: stroke(look.jersey, 9),
    skin: fill(look.skin),
    hair: fill(look.hair),
    accent: fill(look.accent),
    accentStroke: stroke(look.accent, 9),
    outline: stroke(outlineColor, 3),
    thinOutline: stroke(outlineColor, 2),
    white: fill('#ffffff'),
    dark: fill(outlineColor),
    brow: stroke(outlineColor, 3.5),
    shine: stroke('#ffffff', 4, 0.35),
    gold: fill('#e0b84a'),
    goldStroke: stroke('#e0b84a', 2.5),
    red: fill('#d8364a'),
    mouseHead: fill('#141016'),
  }
}

const R = PLAYER.HEAD_R
const BOX = { x: -R, y: -R, width: R * 2, height: R * 2 }
const HEAD_SHAPE = { rect: BOX, rx: R, ry: R }

/**
 * Pinta una franja recortada a la forma de la cabeza: el visor del casco, el
 * buff, la máscara de pájaro, la barba. Con un trozo de círculo (lo primero
 * que se probó) quedaban en diagonal y se leían como una sombra.
 */
function band(canvas: SkCanvas, x: number, y: number, w: number, h: number, paint: SkPaint, outline?: SkPaint): void {
  'worklet'
  canvas.save()
  canvas.clipRRect(HEAD_SHAPE, ClipOp.Intersect, true)
  canvas.drawRRect({ rect: { x, y, width: w, height: h }, rx: 8, ry: 8 }, paint)
  if (outline) canvas.drawRRect({ rect: { x, y, width: w, height: h }, rx: 8, ry: 8 }, outline)
  canvas.restore()
}

/** Lo que va detrás de la cabeza: melenas, moño, capucha, orejas, gorro de bufón. */
function drawBack(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const l = d.look
  if (l.mask === 'mouse') {
    for (const [ox, oy] of [
      [-22, -R - 6],
      [14, -R - 12],
    ]) {
      canvas.drawCircle(ox, oy, 19, d.mouseHead)
      canvas.drawCircle(ox, oy, 19, d.outline)
    }
    return
  }
  if (l.mask === 'jester') {
    // El gorro de bufón: dos puntas con su cascabel.
    const hat = Skia.Path.Make()
    hat.moveTo(-R + 4, -14)
    hat.quadTo(-R - 18, -R - 10, -R - 22, -R - 26)
    hat.quadTo(-8, -R - 6, 0, -R + 2)
    hat.quadTo(10, -R - 20, 22, -R - 34)
    hat.quadTo(28, -R + 2, R - 6, -14)
    hat.close()
    canvas.drawPath(hat, d.accent)
    canvas.drawPath(hat, d.outline)
    canvas.drawCircle(-R - 22, -R - 26, 6, d.gold)
    canvas.drawCircle(22, -R - 34, 6, d.gold)
    return
  }
  if (l.mask === 'robot' || l.mask === 'marsh') return
  if (l.hair_style === 'long') {
    const rect = { x: -R - 6, y: -R + 4, width: R * 2, height: R * 2 + 20 }
    canvas.drawRRect({ rect, rx: R, ry: R }, d.hair)
    canvas.drawRRect({ rect, rx: R, ry: R }, d.outline)
  } else if (l.hair_style === 'bob') {
    const rect = { x: -R - 9, y: -R - 2, width: R * 2 + 4, height: R * 2 + 8 }
    canvas.drawRRect({ rect, rx: R, ry: R * 0.7 }, d.hair)
    canvas.drawRRect({ rect, rx: R, ry: R * 0.7 }, d.outline)
  } else if (l.hair_style === 'bun') {
    canvas.drawCircle(-R * 0.7, -R * 0.78, 12, d.hair)
    canvas.drawCircle(-R * 0.7, -R * 0.78, 12, d.outline)
  } else if (l.hair_style === 'hood') {
    canvas.drawCircle(-6, -2, R + 9, d.accent)
    canvas.drawCircle(-6, -2, R + 9, d.outline)
  }
}

/** El ojo mirando hacia (lx, ly), en coordenadas de la cabeza. */
function drawEye(canvas: SkCanvas, d: DjPaints, lx: number, ly: number): void {
  'worklet'
  const ex = 16
  const ey = -4
  let dx = lx - ex
  let dy = ly - ey
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  dx = (dx / len) * 3.5
  dy = (dy / len) * 3.5
  canvas.drawCircle(ex, ey, 9.5, d.white)
  canvas.drawCircle(ex, ey, 9.5, d.thinOutline)
  canvas.drawCircle(ex + dx, ey + dy, 4.5, d.dark)
}

function drawX(canvas: SkCanvas, d: DjPaints, x: number, y: number, s: number): void {
  'worklet'
  canvas.drawLine(x - s, y - s, x + s, y + s, d.brow)
  canvas.drawLine(x - s, y + s, x + s, y - s, d.brow)
}

/** Las caras tapadas: casco, cabeza de ratón y cubo. Sustituyen a la cabeza entera. */
function drawHelmet(canvas: SkCanvas, d: DjPaints): boolean {
  'worklet'
  const m = d.look.mask
  if (m === 'robot') {
    canvas.drawCircle(0, 0, R, d.accent)
    canvas.drawCircle(0, 0, R, d.outline)
    // El visor: una franja oscura de lado a lado de la cara, con su brillo.
    band(canvas, -6, -12, R + 12, 22, d.dark)
    canvas.drawLine(6, -6, 24, -6, d.shine)
    canvas.drawCircle(0, 0, R, d.outline)
    return true
  }
  if (m === 'mouse') {
    canvas.drawCircle(0, 0, R, d.mouseHead)
    canvas.drawCircle(0, 0, R, d.outline)
    canvas.drawCircle(16, -8, 10, d.white)
    drawX(canvas, d, 16, -8, 5)
    // La sonrisa de dientes.
    canvas.drawArc({ x: -2, y: 0, width: 34, height: 24 }, 0, 180, true, d.white)
    canvas.drawArc({ x: -2, y: 0, width: 34, height: 24 }, 0, 180, true, d.thinOutline)
    for (const tx of [7, 15, 23]) canvas.drawLine(tx, 12, tx, 22, d.thinOutline)
    return true
  }
  if (m === 'marsh') {
    const rect = { x: -R + 2, y: -R - 8, width: R * 2 - 4, height: R * 2 + 12 }
    canvas.drawRRect({ rect, rx: 14, ry: 14 }, d.white)
    canvas.drawRRect({ rect, rx: 14, ry: 14 }, d.outline)
    drawX(canvas, d, 6, -8, 5)
    drawX(canvas, d, 24, -8, 5)
    canvas.drawArc({ x: 0, y: 0, width: 30, height: 18 }, 10, 160, false, d.brow)
    return true
  }
  return false
}

/**
 * La cabeza de un DJ con centro en (x, cy), mirando hacia `f` (1 derecha, -1
 * izquierda). El ojo mira hacia (lookX, lookY).
 */
export function drawHead(
  canvas: SkCanvas,
  d: DjPaints,
  x: number,
  cy: number,
  f: number,
  lookX: number,
  lookY: number,
): void {
  'worklet'
  const l = d.look
  canvas.save()
  canvas.translate(x, cy)
  canvas.scale(f, 1)
  const lx = (lookX - x) * f
  const ly = lookY - cy

  drawBack(canvas, d)
  if (drawHelmet(canvas, d)) {
    canvas.restore()
    return
  }

  canvas.drawCircle(0, 0, R, d.skin)
  canvas.drawCircle(0, 0, R, d.outline)

  // Pelo por encima.
  const hs = l.hair_style
  if (hs === 'bald') {
    canvas.drawArc({ x: -R + 8, y: -R + 8, width: R * 2 - 16, height: R * 2 - 16 }, 200, 50, false, d.shine)
  } else if (hs === 'short' || hs === 'bun') {
    canvas.drawArc(BOX, 195, 150, false, d.hair)
  } else if (hs === 'slick') {
    canvas.drawArc(BOX, 185, 150, false, d.hair)
    const tail = Skia.Path.Make()
    tail.moveTo(-R + 4, -12)
    tail.lineTo(-R - 8, -4)
    tail.lineTo(-R + 2, 4)
    tail.close()
    canvas.drawPath(tail, d.hair)
  } else if (hs === 'long' || hs === 'bob') {
    canvas.drawArc(BOX, 188, 160, false, d.hair)
  } else if (hs === 'hood') {
    // El borde de la capucha enmarca la cara por arriba y por detrás.
    canvas.drawArc({ x: -R - 2, y: -R - 2, width: R * 2 + 4, height: R * 2 + 4 }, 100, 210, false, d.accentStroke)
  }

  if (l.beard) {
    // Barba: la mandíbula de delante, de la patilla a la barbilla.
    band(canvas, -6, 6, R + 12, R, d.hair)
  }

  if (l.mask === 'jester') {
    // Máscara veneciana blanca con adornos dorados: tapa toda la cara.
    canvas.drawArc({ x: -R + 2, y: -R + 2, width: R * 2 - 4, height: R * 2 - 4 }, -95, 190, false, d.white)
    canvas.drawOval({ x: 8, y: -8, width: 16, height: 7 }, d.dark)
    canvas.drawArc({ x: 4, y: -16, width: 24, height: 20 }, 190, 160, false, d.goldStroke)
    canvas.drawOval({ x: 14, y: 14, width: 10, height: 5 }, d.red)
    canvas.drawArc({ x: -R + 2, y: -R + 2, width: R * 2 - 4, height: R * 2 - 4 }, -95, 190, false, d.thinOutline)
    canvas.restore()
    return
  }

  drawEye(canvas, d, lx, ly)

  if (l.mask === 'beak') {
    // Máscara dorada de pájaro: un antifaz ancho, con el pico hacia delante.
    band(canvas, -10, -20, R + 14, 24, d.gold, d.thinOutline)
    canvas.drawCircle(16, -6, 5, d.dark)
    const beak = Skia.Path.Make()
    beak.moveTo(R - 8, -12)
    beak.quadTo(R + 18, -6, R + 30, 10)
    beak.quadTo(R + 8, 6, R - 8, 10)
    beak.close()
    canvas.drawPath(beak, d.gold)
    canvas.drawPath(beak, d.thinOutline)
    canvas.restore()
    return
  }

  if (l.glasses === 'round') {
    canvas.drawCircle(16, -4, 12.5, d.thinOutline)
    canvas.drawLine(4, -4, -10, -6, d.thinOutline)
  } else if (l.glasses === 'rect') {
    canvas.drawRRect({ rect: { x: 3, y: -12, width: 27, height: 15 }, rx: 3, ry: 3 }, d.thinOutline)
    canvas.drawLine(3, -6, -12, -8, d.thinOutline)
  }

  // Cejas casi rectas, algo subidas: con la punta hacia abajo todos parecían enfadados.
  canvas.drawLine(8, -17, 26, -19, d.brow)

  if (l.mask === 'buff') {
    // Buff hasta la nariz: solo se le ven los ojos.
    band(canvas, -R, 4, R * 2, R, d.accent, d.thinOutline)
  } else if (l.grin) {
    canvas.drawArc({ x: 6, y: 6, width: 26, height: 18 }, 0, 180, true, d.white)
    canvas.drawArc({ x: 6, y: 6, width: 26, height: 18 }, 0, 180, true, d.thinOutline)
  } else if (!l.beard) {
    canvas.drawLine(14, 17, 26, 15, d.brow)
  } else {
    canvas.drawLine(15, 16, 26, 15, d.shine)
  }
  canvas.restore()
}

/** Torso y cabeza, para los retratos. Cabe en un cuadro de 100 × 100. */
export function drawPortrait(canvas: SkCanvas, d: DjPaints, size: number): void {
  'worklet'
  const k = size / 100
  canvas.save()
  canvas.scale(k, k)
  // Más pequeño que el cuadro: las orejas, el gorro de bufón y el pico se salen
  // mucho de la cabeza, y a tamaño completo quedaban cortados.
  canvas.translate(50, 58)
  canvas.scale(0.7, 0.7)
  canvas.translate(-50, -58)
  canvas.drawRRect({ rect: { x: 28, y: 82, width: 44, height: 34 }, rx: 12, ry: 12 }, d.jersey)
  canvas.drawRRect({ rect: { x: 28, y: 82, width: 44, height: 34 }, rx: 12, ry: 12 }, d.outline)
  drawHead(canvas, d, 50, 52, 1, 120, 46)
  canvas.restore()
}
