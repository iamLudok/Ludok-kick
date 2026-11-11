/**
 * Cómo se dibuja cada DJ. La cabeza va aparte del cuerpo porque se usa en dos
 * sitios: en el partido y en los retratos de la pantalla de selección.
 *
 * Lo que hace reconocible a cada uno es la silueta (pelo, gorro, gafas) y no
 * solo el color: en una pantalla pequeña y con todo moviéndose, dos muñecos
 * que solo cambian de color se confunden.
 */
import { PaintStyle, Skia, StrokeCap, type SkCanvas, type SkPaint } from '@shopify/react-native-skia'
import { PLAYER } from '../game/constants'
import type { DjLook } from '../content/djs'

export type DjPaints = {
  head: DjLook['head']
  glasses: DjLook['glasses']
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
  band: SkPaint
  brow: SkPaint
  lens: SkPaint
  glint: SkPaint
}

function fill(color: string): SkPaint {
  const p = Skia.Paint()
  p.setAntiAlias(true)
  p.setColor(Skia.Color(color))
  return p
}

function stroke(color: string, width: number): SkPaint {
  const p = fill(color)
  p.setStyle(PaintStyle.Stroke)
  p.setStrokeWidth(width)
  p.setStrokeCap(StrokeCap.Round)
  return p
}

export function createDjPaints(look: DjLook, outlineColor: string): DjPaints {
  const glint = stroke('#ffffff', 2)
  glint.setAlphaf(0.7)
  return {
    head: look.head,
    glasses: look.glasses,
    jersey: fill(look.jersey),
    leg: stroke(look.jersey, 9),
    skin: fill(look.skin),
    hair: fill(look.hair),
    accent: fill(look.accent),
    accentStroke: stroke(look.accent, 5),
    outline: stroke(outlineColor, 3),
    thinOutline: stroke(outlineColor, 2),
    white: fill('#ffffff'),
    dark: fill(outlineColor),
    band: stroke(outlineColor, 7),
    brow: stroke(outlineColor, 3.5),
    lens: fill('#121018'),
    glint,
  }
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
  const R = PLAYER.HEAD_R
  const box = { x: x - R, y: cy - R, width: R * 2, height: R * 2 }

  // Lo que va por detrás de la cabeza: la melena y los rizos.
  if (d.head === 'long') {
    canvas.drawRRect({ rect: { x: x - f * 6 - R, y: cy - R + 4, width: R * 2, height: R * 2 + 18 }, rx: R, ry: R }, d.hair)
    canvas.drawRRect({ rect: { x: x - f * 6 - R, y: cy - R + 4, width: R * 2, height: R * 2 + 18 }, rx: R, ry: R }, d.outline)
  } else if (d.head === 'curly') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI
      const ox = Math.cos(a) * (R - 2) - f * 6
      const oy = Math.sin(a) * (R - 2) - 4
      canvas.drawCircle(x + ox, cy + oy, 15, d.hair)
      canvas.drawCircle(x + ox, cy + oy, 15, d.outline)
    }
  }

  canvas.drawCircle(x, cy, R, d.skin)
  canvas.drawCircle(x, cy, R, d.outline)

  // Lo que va encima: pelo corto, gorro, flequillo.
  if (d.head === 'buzz') {
    canvas.drawArc(box, 195, 150, false, d.hair)
  } else if (d.head === 'beanie') {
    canvas.drawArc({ x: x - R - 1, y: cy - R - 3, width: R * 2 + 2, height: R * 2 + 2 }, 180, 180, false, d.hair)
    canvas.drawArc({ x: x - R - 1, y: cy - R - 3, width: R * 2 + 2, height: R * 2 + 2 }, 180, 180, false, d.outline)
    canvas.drawRRect({ rect: { x: x - R - 2, y: cy - 12, width: R * 2 + 4, height: 11 }, rx: 5, ry: 5 }, d.accent)
    canvas.drawRRect({ rect: { x: x - R - 2, y: cy - 12, width: R * 2 + 4, height: 11 }, rx: 5, ry: 5 }, d.thinOutline)
    canvas.drawCircle(x - f * 4, cy - R - 4, 7, d.accent)
    canvas.drawCircle(x - f * 4, cy - R - 4, 7, d.thinOutline)
  } else if (d.head === 'long') {
    canvas.drawArc(box, 190, 160, false, d.hair)
    // La cinta de la frente.
    canvas.drawArc({ x: x - R + 3, y: cy - R + 3, width: (R - 3) * 2, height: (R - 3) * 2 }, 200, 140, false, d.accentStroke)
  } else {
    canvas.drawArc(box, 200, 140, false, d.hair)
  }

  // Auriculares: la diadema por encima y el casco en la sien, bien atrás,
  // lejos del ojo: más centrado, los dos círculos juntos se leían como gafas.
  if (d.head !== 'beanie') {
    canvas.drawArc({ x: x - R + 2, y: cy - R + 2, width: (R - 2) * 2, height: (R - 2) * 2 }, -160, 140, false, d.band)
  }
  canvas.drawCircle(x - f * 19, cy + 5, 12, d.jersey)
  canvas.drawCircle(x - f * 19, cy + 5, 12, d.outline)
  canvas.drawCircle(x - f * 19, cy + 5, 4.5, d.dark)

  // El ojo sigue al vinilo: es poca cosa, pero hace que el muñeco parezca atento.
  const ex = x + f * 17
  const ey = cy - 3
  if (d.glasses === 'shades') {
    canvas.drawRRect({ rect: { x: ex - 13, y: ey - 8, width: 26, height: 15 }, rx: 6, ry: 6 }, d.lens)
    canvas.drawLine(ex - 6, ey - 4, ex + 2, ey - 4, d.glint)
    canvas.drawLine(x + f * 4, ey - 2, ex - f * 13, ey - 2, d.thinOutline)
  } else {
    let lx = lookX - ex
    let ly = lookY - ey
    const len = Math.sqrt(lx * lx + ly * ly) || 1
    lx = (lx / len) * 3.5
    ly = (ly / len) * 3.5
    canvas.drawCircle(ex, ey, 9.5, d.white)
    canvas.drawCircle(ex, ey, 9.5, d.thinOutline)
    canvas.drawCircle(ex + lx, ey + ly, 4.5, d.dark)
    if (d.glasses === 'round') {
      canvas.drawCircle(ex, ey, 12.5, d.thinOutline)
      canvas.drawLine(ex - f * 12.5, ey, x + f * 3, ey - 2, d.thinOutline)
    }
  }
  canvas.drawLine(x + f * 7, cy - 19, x + f * 27, cy - 14, d.brow)
  canvas.drawLine(x + f * 14, cy + 17, x + f * 26, cy + 15, d.brow)
}

/** Torso y cabeza, para los retratos. Cabe en un cuadro de 100 × 100 centrado en (50, 50). */
export function drawPortrait(canvas: SkCanvas, d: DjPaints, size: number): void {
  'worklet'
  const k = size / 100
  canvas.save()
  canvas.scale(k, k)
  canvas.drawRRect({ rect: { x: 28, y: 76, width: 44, height: 34 }, rx: 12, ry: 12 }, d.jersey)
  canvas.drawRRect({ rect: { x: 28, y: 76, width: 44, height: 34 }, rx: 12, ry: 12 }, d.outline)
  drawHead(canvas, d, 50, 46, 1, 120, 40)
  canvas.restore()
}
