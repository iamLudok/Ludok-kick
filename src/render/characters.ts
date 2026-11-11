/**
 * Cómo se dibuja cada DJ. La cabeza va aparte del cuerpo porque se usa en
 * tres sitios: el partido, los retratos de los menús y la pantalla VS.
 *
 * Las cabezas van casi de frente, giradas un poco hacia el rival (vista de
 * tres cuartos), con sombra en la mitad de atrás y contorno grueso. De perfil,
 * que fue lo primero que se probó, no se reconocía a nadie: una cara se
 * reconoce de frente. Cada DJ exagera uno o dos rasgos (la calva y la sonrisa,
 * la melena, el casco): en el partido la cabeza es pequeña y solo se leen los
 * rasgos gordos.
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
  skinShade: SkPaint
  cheek: SkPaint
  hair: SkPaint
  hairShade: SkPaint
  stubble: SkPaint
  accent: SkPaint
  accentShade: SkPaint
  accentStroke: SkPaint
  outline: SkPaint
  thinOutline: SkPaint
  band: SkPaint
  white: SkPaint
  dark: SkPaint
  brow: SkPaint
  line: SkPaint
  shine: SkPaint
  glint: SkPaint
  gold: SkPaint
  goldStroke: SkPaint
  red: SkPaint
  mouseHead: SkPaint
  mouth: SkPaint
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

/** El mismo color, más oscuro: para la sombra de la piel, del pelo, del casco. */
export function darken(hex: string, k: number): string {
  const h = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * k))
  return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

export function createDjPaints(look: DjLook, outlineColor: string): DjPaints {
  const faceVisible = look.mask === 'none' || look.mask === 'buff' || look.mask === 'beak'
  return {
    look,
    jersey: fill(look.jersey),
    leg: stroke(look.jersey, 9),
    skin: fill(look.skin),
    skinShade: fill(darken(look.skin, 0.86)),
    cheek: fill('#ff7a7a', 0.25),
    hair: fill(look.hairColor),
    hairShade: fill(darken(look.hairColor, 0.7)),
    stubble: fill(look.hairColor, 0.32),
    accent: fill(look.accent),
    accentShade: fill(darken(look.accent, 0.75)),
    accentStroke: stroke(look.accent, 9),
    outline: stroke(outlineColor, 3.5),
    thinOutline: stroke(outlineColor, 2.2),
    band: stroke(outlineColor, 7),
    white: fill('#ffffff'),
    dark: fill(outlineColor),
    // Las cejas, del color del pelo (oscurecido): negras sobre cualquier pelo
    // parecían pintadas.
    brow: stroke(faceVisible ? darken(look.hairColor, 0.75) : outlineColor, 4.5),
    line: stroke(outlineColor, 2.5),
    shine: fill('#ffffff', 0.28),
    glint: stroke('#ffffff', 3, 0.6),
    gold: fill('#e8c25a'),
    goldStroke: stroke('#e8c25a', 2.5),
    red: fill('#d8364a'),
    mouseHead: fill('#18131c'),
    mouth: fill('#5a1f24'),
  }
}

const R = PLAYER.HEAD_R
const BOX = { x: -R, y: -R, width: R * 2, height: R * 2 }
const HEAD_SHAPE = { rect: BOX, rx: R, ry: R }

/** Los dos ojos: el cercano, delante; el lejano, más pequeño y hacia la nuca. */
const NEAR = { x: 15, y: -6, rx: 7.5, ry: 9 }
const FAR = { x: -7, y: -6, rx: 6.2, ry: 8 }

function clipHead(canvas: SkCanvas): void {
  'worklet'
  canvas.save()
  canvas.clipRRect(HEAD_SHAPE, ClipOp.Intersect, true)
}

/** La sombra de la mitad de atrás y el brillo de la frente: es lo que da volumen. */
function shadeHead(canvas: SkCanvas, shade: SkPaint, shine: SkPaint): void {
  'worklet'
  clipHead(canvas)
  canvas.drawCircle(-R * 1.5, R * 0.1, R * 1.05, shade)
  canvas.drawOval({ x: 0, y: -R + 7, width: 20, height: 10 }, shine)
  canvas.restore()
}

/** Una franja recortada a la forma de la cabeza: visor, antifaz, buff, barba. */
function band(canvas: SkCanvas, x: number, y: number, w: number, h: number, paint: SkPaint, outline?: SkPaint): void {
  'worklet'
  clipHead(canvas)
  canvas.drawRRect({ rect: { x, y, width: w, height: h }, rx: 8, ry: 8 }, paint)
  if (outline) canvas.drawRRect({ rect: { x, y, width: w, height: h }, rx: 8, ry: 8 }, outline)
  canvas.restore()
}

function eye(canvas: SkCanvas, d: DjPaints, e: typeof NEAR, lx: number, ly: number): void {
  'worklet'
  canvas.drawOval({ x: e.x - e.rx, y: e.y - e.ry, width: e.rx * 2, height: e.ry * 2 }, d.white)
  canvas.drawOval({ x: e.x - e.rx, y: e.y - e.ry, width: e.rx * 2, height: e.ry * 2 }, d.thinOutline)
  let dx = lx - e.x
  let dy = ly - e.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  dx = (dx / len) * e.rx * 0.38
  dy = (dy / len) * e.ry * 0.3
  canvas.drawCircle(e.x + dx, e.y + dy, e.rx * 0.55, d.dark)
  canvas.drawCircle(e.x + dx + 1.5, e.y + dy - 2, e.rx * 0.18, d.white)
}

function xEye(canvas: SkCanvas, d: DjPaints, x: number, y: number, s: number): void {
  'worklet'
  canvas.drawLine(x - s, y - s, x + s, y + s, d.outline)
  canvas.drawLine(x - s, y + s, x + s, y - s, d.outline)
}

function brows(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const b = d.look.brows
  // La ceja cercana y la lejana. «frown» baja hacia dentro (decidido, como en el
  // género); «raised», arriba (alegre).
  if (b === 'frown') {
    canvas.drawLine(7, -21, 24, -16, d.brow)
    canvas.drawLine(-14, -17, -1, -20, d.brow)
  } else if (b === 'raised') {
    canvas.drawLine(7, -21, 23, -24, d.brow)
    canvas.drawLine(-14, -22, -1, -23, d.brow)
  } else {
    canvas.drawLine(7, -19, 24, -19, d.brow)
    canvas.drawLine(-14, -19, -1, -19, d.brow)
  }
}

function mouth(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const m = d.look.mouth
  if (m === 'grin') {
    // Sonrisa de oreja a oreja, con los dientes.
    const r = { x: -6, y: 8, width: 30, height: 20 }
    canvas.drawArc(r, 0, 180, true, d.mouth)
    canvas.save()
    canvas.clipRRect({ rect: { x: -6, y: 8, width: 30, height: 20 }, rx: 15, ry: 10 }, ClipOp.Intersect, true)
    canvas.drawRect({ x: -6, y: 18, width: 30, height: 5 }, d.white)
    canvas.restore()
    canvas.drawArc(r, 0, 180, true, d.line)
  } else if (m === 'smile') {
    canvas.drawArc({ x: -2, y: 6, width: 22, height: 16 }, 20, 140, false, d.line)
  } else if (m === 'open') {
    canvas.drawOval({ x: 2, y: 13, width: 12, height: 10 }, d.mouth)
    canvas.drawOval({ x: 2, y: 13, width: 12, height: 10 }, d.line)
  } else {
    canvas.drawLine(1, 18, 17, 17, d.line)
  }
}

/** Lo que va detrás de la cabeza: melenas, moño, capucha, oreja, orejas de ratón, gorro de bufón. */
function drawBack(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const l = d.look
  if (l.mask === 'mouse') {
    canvas.drawCircle(-24, -R + 2, 21, d.mouseHead)
    canvas.drawCircle(-24, -R + 2, 21, d.outline)
    canvas.drawCircle(20, -R - 2, 22, d.mouseHead)
    canvas.drawCircle(20, -R - 2, 22, d.outline)
    return
  }
  if (l.mask === 'jester') {
    const hat = Skia.Path.Make()
    hat.moveTo(-R + 2, -10)
    hat.quadTo(-R - 18, -R - 8, -R - 20, -R - 28)
    hat.quadTo(-10, -R - 8, 0, -R + 4)
    hat.quadTo(12, -R - 22, 26, -R - 34)
    hat.quadTo(30, -R + 2, R - 2, -10)
    hat.close()
    canvas.drawPath(hat, d.accent)
    canvas.drawPath(hat, d.outline)
    for (const [bx, by] of [
      [-R - 20, -R - 28],
      [26, -R - 34],
    ]) {
      canvas.drawCircle(bx, by, 6.5, d.gold)
      canvas.drawCircle(bx, by, 6.5, d.thinOutline)
    }
    return
  }
  if (l.mask === 'robot' || l.mask === 'marsh') return

  const hs = l.hair
  if (hs === 'long' || hs === 'longCenter') {
    const rect = { x: -R - 7, y: -R + 2, width: R * 2 + 12, height: R * 2 + 26 }
    canvas.drawRRect({ rect, rx: R, ry: R * 0.9 }, d.hair)
    canvas.drawRRect({ rect, rx: R, ry: R * 0.9 }, d.outline)
  } else if (hs === 'bob') {
    const rect = { x: -R - 8, y: -R, width: R * 2 + 14, height: R * 2 + 10 }
    canvas.drawRRect({ rect, rx: R, ry: R * 0.8 }, d.hair)
    canvas.drawRRect({ rect, rx: R, ry: R * 0.8 }, d.outline)
  } else if (hs === 'bun') {
    canvas.drawCircle(-6, -R - 6, 13, d.hair)
    canvas.drawCircle(-6, -R - 6, 13, d.outline)
  } else if (hs === 'hood') {
    canvas.drawCircle(-5, -1, R + 10, d.accent)
    canvas.drawCircle(-5, -1, R + 10, d.outline)
  }

  // La oreja de atrás asoma por el lado (con capucha o melena no se ve).
  if (hs !== 'hood' && hs !== 'long' && hs !== 'longCenter' && hs !== 'bob') {
    canvas.drawOval({ x: -R - 6, y: -6, width: 14, height: 18 }, d.skin)
    canvas.drawOval({ x: -R - 6, y: -6, width: 14, height: 18 }, d.outline)
  }
  if (l.headphones) {
    // La diadema de los auriculares, por encima de la cabeza.
    canvas.drawArc({ x: -R - 3, y: -R - 5, width: R * 2 + 4, height: R * 2 + 4 }, 195, 150, false, d.band)
  }
}

/** Pelo por encima de la cabeza. */
function drawHair(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const hs = d.look.hair
  if (hs === 'bald' || hs === 'hood') return
  clipHead(canvas)
  if (hs === 'buzz') {
    canvas.drawOval({ x: -R - 4, y: -R - 10, width: R * 2 + 4, height: R * 0.95 }, d.stubble)
  } else if (hs === 'spiky') {
    // Pelo de punta: una fila de picos sobre la frente.
    const p = Skia.Path.Make()
    p.moveTo(-R, -4)
    p.lineTo(-R, -R)
    for (let i = 0; i < 6; i++) {
      const x = -R + (i * (R * 2)) / 6
      p.lineTo(x + R / 6, -R + 18)
      p.lineTo(x + R / 3, -R - 2)
    }
    p.lineTo(R, -14)
    p.close()
    canvas.drawPath(p, d.hair)
  } else if (hs === 'slick') {
    // Engominado hacia atrás: brillante y pegado.
    canvas.drawOval({ x: -R - 8, y: -R - 16, width: R * 2 + 12, height: R + 4 }, d.hair)
    canvas.drawOval({ x: -R + 4, y: -R - 4, width: R, height: 8 }, d.shine)
  } else if (hs === 'bob') {
    // Flequillo recto tapando la frente.
    canvas.drawRect({ x: -R, y: -R, width: R * 2, height: R - 14 }, d.hair)
  } else if (hs === 'longCenter') {
    // Raya al medio: dos cortinas que bajan por los lados de la cara.
    canvas.drawOval({ x: -R - 14, y: -R - 10, width: R + 2, height: R * 1.8 }, d.hair)
    canvas.drawOval({ x: 24, y: -R - 10, width: R, height: R * 1.6 }, d.hair)
    canvas.drawOval({ x: -R, y: -R - 12, width: R * 2, height: 18 }, d.hair)
  } else {
    // Corto, melena o moño: un casquete con un mechón hacia delante.
    canvas.drawOval({ x: -R - 6, y: -R - 14, width: R * 2 + 10, height: R + 6 }, d.hair)
    canvas.drawOval({ x: 6, y: -R + 2, width: 22, height: 14 }, d.hair)
  }
  canvas.restore()
}

/** Las caras tapadas del todo: casco, cabeza de ratón y cubo. Sustituyen a la cabeza entera. */
function drawHelmet(canvas: SkCanvas, d: DjPaints): boolean {
  'worklet'
  const m = d.look.mask
  if (m === 'robot') {
    canvas.drawCircle(0, 0, R, d.accent)
    shadeHead(canvas, d.accentShade, d.shine)
    // El visor de lado a lado, con su reflejo.
    band(canvas, -R, -14, R * 2, 24, d.dark)
    canvas.drawLine(-2, -6, 22, -6, d.glint)
    canvas.drawCircle(0, 0, R, d.outline)
    return true
  }
  if (m === 'mouse') {
    canvas.drawCircle(0, 0, R, d.mouseHead)
    canvas.drawCircle(0, 0, R, d.outline)
    for (const e of [NEAR, FAR]) {
      canvas.drawCircle(e.x, e.y - 2, e.rx + 3, d.white)
      xEye(canvas, d, e.x, e.y - 2, e.rx * 0.55)
    }
    canvas.drawArc({ x: -14, y: 4, width: 38, height: 26 }, 0, 180, true, d.white)
    canvas.drawArc({ x: -14, y: 4, width: 38, height: 26 }, 0, 180, true, d.thinOutline)
    for (const tx of [-6, 2, 10, 18]) canvas.drawLine(tx, 17, tx, 28, d.thinOutline)
    return true
  }
  if (m === 'marsh') {
    const shape = { rect: { x: -R + 1, y: -R - 10, width: R * 2 - 2, height: R * 2 + 14 }, rx: 16, ry: 16 }
    canvas.drawRRect(shape, d.white)
    canvas.save()
    canvas.clipRRect(shape, ClipOp.Intersect, true)
    canvas.drawRect({ x: -R - 10, y: -R - 10, width: 16, height: R * 2 + 20 }, d.skinShade)
    canvas.restore()
    canvas.drawRRect(shape, d.outline)
    xEye(canvas, d, FAR.x, -6, 5)
    xEye(canvas, d, NEAR.x, -6, 6)
    canvas.drawArc({ x: -8, y: 2, width: 30, height: 18 }, 15, 150, false, d.outline)
    return true
  }
  return false
}

/**
 * La cabeza de un DJ con centro en (x, cy), mirando hacia `f` (1 derecha, -1
 * izquierda). Los ojos miran hacia (lookX, lookY).
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
  shadeHead(canvas, d.skinShade, d.shine)
  drawHair(canvas, d)

  if (l.mask === 'jester') {
    // Máscara veneciana blanca de cara entera, con adornos dorados.
    clipHead(canvas)
    canvas.drawCircle(4, 0, R + 2, d.white)
    canvas.drawCircle(-R * 1.3, R * 0.2, R * 0.9, d.skinShade)
    canvas.restore()
    for (const e of [NEAR, FAR]) {
      canvas.drawOval({ x: e.x - e.rx - 2, y: e.y - 3, width: e.rx * 2 + 4, height: 7 }, d.dark)
      canvas.drawArc({ x: e.x - e.rx - 5, y: e.y - 13, width: e.rx * 2 + 10, height: 18 }, 200, 140, false, d.goldStroke)
    }
    canvas.drawOval({ x: 2, y: 14, width: 14, height: 6 }, d.red)
    canvas.drawCircle(0, 0, R, d.outline)
    canvas.restore()
    return
  }

  if (l.facialHair === 'stubble') band(canvas, -R, 6, R * 2, R, d.stubble)
  else if (l.facialHair === 'beard') band(canvas, -R, 8, R * 2, R, d.hair)

  // Mofletes, salvo que la barba o el buff los tapen.
  if (l.facialHair !== 'beard' && l.mask !== 'buff') {
    canvas.drawOval({ x: 14, y: 6, width: 14, height: 8 }, d.cheek)
    canvas.drawOval({ x: -12, y: 6, width: 10, height: 7 }, d.cheek)
  }

  eye(canvas, d, FAR, lx, ly)
  eye(canvas, d, NEAR, lx, ly)

  if (l.mask === 'beak') {
    // Antifaz dorado de pájaro sobre los ojos, con el pico hacia delante.
    band(canvas, -R, -18, R * 2, 22, d.gold, d.thinOutline)
    canvas.drawOval({ x: NEAR.x - 5, y: -10, width: 10, height: 9 }, d.dark)
    canvas.drawOval({ x: FAR.x - 4, y: -10, width: 8, height: 8 }, d.dark)
    const beak = Skia.Path.Make()
    beak.moveTo(6, -6)
    beak.quadTo(R + 12, -4, R + 26, 14)
    beak.quadTo(R + 2, 10, 8, 10)
    beak.close()
    canvas.drawPath(beak, d.gold)
    canvas.drawPath(beak, d.thinOutline)
    canvas.drawLine(12, 2, R + 18, 10, d.thinOutline)
    canvas.drawCircle(0, 0, R, d.outline)
    canvas.restore()
    return
  }

  const g = l.glasses
  if (g === 'rect') {
    for (const e of [NEAR, FAR]) {
      canvas.drawRRect({ rect: { x: e.x - e.rx - 4, y: e.y - 8, width: e.rx * 2 + 8, height: 15 }, rx: 3, ry: 3 }, d.line)
    }
    canvas.drawLine(FAR.x + FAR.rx + 4, -3, NEAR.x - NEAR.rx - 4, -3, d.line)
  } else if (g === 'round') {
    canvas.drawCircle(NEAR.x, NEAR.y, NEAR.rx + 4, d.line)
    canvas.drawCircle(FAR.x, FAR.y, FAR.rx + 3, d.line)
  }

  brows(canvas, d)

  if (l.mask === 'buff') {
    // Buff hasta la nariz: solo se le ven los ojos.
    band(canvas, -R, 4, R * 2, R, d.accent)
    clipHead(canvas)
    canvas.drawCircle(-R * 1.25, R * 0.15, R * 1.05, d.accentShade)
    canvas.restore()
    canvas.drawLine(-R + 2, 5, R - 2, 5, d.line)
  } else {
    // Sin nariz a propósito: a este tamaño, cualquier trazo entre el ojo y la
    // boca se leía como parte del ojo (parecía un «9»).
    mouth(canvas, d)
  }

  canvas.drawCircle(0, 0, R, d.outline)
  if (l.hair === 'hood') {
    // El borde de la capucha enmarca la cara.
    canvas.drawArc({ x: -R - 3, y: -R - 3, width: R * 2 + 6, height: R * 2 + 6 }, 120, 260, false, d.accentStroke)
  }
  if (l.headphones) {
    // El casco de los auriculares sobre la oreja de atrás.
    canvas.drawRRect({ rect: { x: -R - 8, y: -10, width: 16, height: 26 }, rx: 7, ry: 7 }, d.accent)
    canvas.drawRRect({ rect: { x: -R - 8, y: -10, width: 16, height: 26 }, rx: 7, ry: 7 }, d.outline)
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
  canvas.drawRRect({ rect: { x: 26, y: 82, width: 48, height: 34 }, rx: 12, ry: 12 }, d.jersey)
  canvas.drawRRect({ rect: { x: 26, y: 82, width: 48, height: 34 }, rx: 12, ry: 12 }, d.outline)
  drawHead(canvas, d, 50, 52, 1, 130, 52)
  canvas.restore()
}
