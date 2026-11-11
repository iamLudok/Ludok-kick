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
  yellow: SkPaint
  paisley: SkPaint
  streak: SkPaint
  thick: SkPaint
  fat: SkPaint
  hatBlack: SkPaint
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
    yellow: fill('#f2c230'),
    paisley: stroke('#e8e8ea', 1.8, 0.85),
    streak: fill(look.streaks ?? look.hairColor),
    thick: stroke(outlineColor, 4.5),
    fat: stroke(outlineColor, 7),
    hatBlack: fill('#141216'),
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
  } else if (m === 'smirk') {
    // Media sonrisa: sube solo por un lado.
    const p = Skia.Path.Make()
    p.moveTo(0, 17)
    p.quadTo(10, 20, 19, 12)
    canvas.drawPath(p, d.line)
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
    // Orejas negras con un brillo en el borde: sin él, sobre un fondo oscuro
    // desaparecían, y son lo que más se reconoce.
    for (const [ox, oy, r] of [
      [-26, -R + 2, 23],
      [22, -R - 4, 24],
    ]) {
      canvas.drawCircle(ox, oy, r, d.mouseHead)
      canvas.drawCircle(ox, oy, r, d.outline)
      canvas.drawArc({ x: ox - r + 4, y: oy - r + 4, width: (r - 4) * 2, height: (r - 4) * 2 }, 200, 110, false, d.glint)
    }
    return
  }
  if (l.mask === 'jester') {
    // Corona de bufón: cinco puntas, alternando blanco y azul, con cascabeles dorados.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.15 + i * 0.175)
      const tipX = Math.cos(a) * (R + 26)
      const tipY = Math.sin(a) * (R + 26) - 4
      const p = Skia.Path.Make()
      p.moveTo(Math.cos(a - 0.22) * (R - 6), Math.sin(a - 0.22) * (R - 6))
      p.lineTo(tipX, tipY)
      p.lineTo(Math.cos(a + 0.22) * (R - 6), Math.sin(a + 0.22) * (R - 6))
      p.close()
      canvas.drawPath(p, i % 2 === 0 ? d.white : d.accent)
      canvas.drawPath(p, d.thinOutline)
      canvas.drawCircle(tipX, tipY, 4.5, d.gold)
    }
    return
  }
  if (l.mask === 'robot' || l.mask === 'marsh') return

  const hs = l.hair
  if (hs === 'messy') {
    // Pelo revuelto: mechones de punta en todas direcciones, más grande que la cabeza.
    const p = Skia.Path.Make()
    const n = 11
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (1.05 + (i / n) * 0.95)
      const r = i % 2 === 0 ? R + 14 : R + 2
      const x = Math.cos(a) * r - 2
      const y = Math.sin(a) * r * 0.95 - 2
      if (i === 0) p.moveTo(x, y)
      else p.lineTo(x, y)
    }
    p.close()
    canvas.drawPath(p, d.hair)
    canvas.drawPath(p, d.outline)
  }
  if (hs === 'long' || hs === 'longCenter' || hs === 'longBack') {
    // Hasta los hombros y no más: con más largo y más ancho tapaba el cuerpo.
    const rect = { x: -R - 5, y: -R + 2, width: R * 2 + 8, height: R * 2 + 12 }
    canvas.drawRRect({ rect, rx: R, ry: R * 0.9 }, d.hair)
    canvas.drawRRect({ rect, rx: R, ry: R * 0.9 }, d.outline)
  } else if (hs === 'bob' || hs === 'bobSide' || hs === 'bobCenter') {
    const rect = { x: -R - 8, y: -R, width: R * 2 + 14, height: R * 2 + 10 }
    // Con mechones de color, la melena entera es de ese color (las raíces
    // oscuras se pintan luego, arriba).
    canvas.drawRRect({ rect, rx: R, ry: R * 0.8 }, l.streaks ? d.streak : d.hair)
    canvas.drawRRect({ rect, rx: R, ry: R * 0.8 }, d.outline)
  } else if (hs === 'bun') {
    canvas.drawCircle(-6, -R - 6, 13, d.hair)
    canvas.drawCircle(-6, -R - 6, 13, d.outline)
  } else if (hs === 'hood') {
    canvas.drawCircle(-5, -1, R + 10, d.accent)
    canvas.drawCircle(-5, -1, R + 10, d.outline)
  }

  // La oreja de atrás asoma por el lado (con capucha o melena no se ve).
  if (
    hs !== 'hood' &&
    hs !== 'long' &&
    hs !== 'longCenter' &&
    hs !== 'longBack' &&
    hs !== 'bob' &&
    hs !== 'bobSide' &&
    hs !== 'bobCenter'
  ) {
    canvas.drawOval({ x: -R - 6, y: -6, width: 14, height: 18 }, d.skin)
    canvas.drawOval({ x: -R - 6, y: -6, width: 14, height: 18 }, d.outline)
  }
  if (l.headphones) {
    // La diadema de los auriculares, por encima de la cabeza.
    canvas.drawArc({ x: -R - 3, y: -R - 5, width: R * 2 + 4, height: R * 2 + 4 }, 195, 150, false, d.band)
  }
}

/**
 * Flequillo largo que cae en diagonal y tapa el ojo de atrás. Se pinta dos
 * veces: con el resto del pelo y, otra vez, encima de los ojos (si no, el ojo
 * tapado asomaba por encima del flequillo).
 */
function drawFringe(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const p = Skia.Path.Make()
  p.moveTo(-R - 4, 8)
  p.lineTo(-R - 4, -R - 4)
  p.lineTo(R + 4, -R - 4)
  p.lineTo(R + 4, -R + 8)
  p.quadTo(16, -R + 12, 6, 4)
  p.quadTo(-6, 6, -R - 4, 8)
  p.close()
  clipHead(canvas)
  canvas.drawPath(p, d.hair)
  canvas.drawPath(p, d.thinOutline)
  canvas.restore()
}

/**
 * Raya al medio con dos cortinas que bajan por delante de la cara hasta la
 * mandíbula. Van encima de todo, contorno de la cabeza incluido: por debajo,
 * el contorno las cortaba y parecían dos piezas sueltas.
 */
function drawCurtains(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  const c = d.look.streaks ? d.streak : d.hair
  const left = Skia.Path.Make()
  left.moveTo(-4, -R - 6)
  left.quadTo(-R - 14, -R + 2, -R - 10, R + 10)
  left.lineTo(-R + 6, R + 4)
  left.quadTo(-R + 2, -6, -6, -R + 4)
  left.close()
  const right = Skia.Path.Make()
  right.moveTo(0, -R - 6)
  right.quadTo(R + 12, -R + 2, R + 8, R + 8)
  right.lineTo(R - 4, R + 2)
  right.quadTo(R - 4, -8, 4, -R + 6)
  right.close()
  for (const p of [left, right]) {
    canvas.drawPath(p, c)
    canvas.drawPath(p, d.thinOutline)
  }
  // Las raíces oscuras arriba, también sobre las cortinas.
  canvas.save()
  canvas.clipRRect({ rect: { x: -R - 20, y: -R - 20, width: R * 2 + 40, height: 22 }, rx: 0, ry: 0 }, ClipOp.Intersect, true)
  canvas.drawPath(left, d.hair)
  canvas.drawPath(right, d.hair)
  canvas.restore()
  canvas.drawLine(-2, -R - 4, -2, -R + 6, d.line)
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
  } else if (hs === 'slick' || hs === 'longBack') {
    // Engominado hacia atrás: brillante y pegado.
    canvas.drawOval({ x: -R - 8, y: -R - 16, width: R * 2 + 12, height: R + 4 }, d.hair)
    canvas.drawOval({ x: -R + 4, y: -R - 4, width: R, height: 8 }, d.shine)
  } else if (hs === 'bob') {
    // Flequillo recto tapando la frente.
    canvas.drawRect({ x: -R, y: -R, width: R * 2, height: R - 14 }, d.hair)
  } else if (hs === 'bobCenter') {
    // Las raíces oscuras en lo alto; las cortinas de delante van aparte
    // (`drawCurtains`), encima del contorno de la cabeza.
    canvas.drawOval({ x: -R - 4, y: -R - 12, width: R * 2 + 8, height: 24 }, d.hair)
  } else if (hs === 'bobSide') {
    // Raya al lado: el pelo cae en diagonal sobre la frente desde la nuca.
    const p = Skia.Path.Make()
    p.moveTo(-R - 4, 6)
    p.lineTo(-R - 4, -R - 4)
    p.lineTo(R + 4, -R - 4)
    p.lineTo(R + 4, -R + 6)
    p.quadTo(4, -R + 4, -14, -10)
    p.close()
    canvas.drawPath(p, d.hair)
  } else if (hs === 'fringe') {
    drawFringe(canvas, d)
  } else if (hs === 'quiff' || hs === 'messy') {
    canvas.drawOval({ x: -R - 6, y: -R - 14, width: R * 2 + 10, height: R + 2 }, d.hair)
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
    // Cabeza de ratón: azul, la mitad de abajo blanca y ojos amarillos con una X.
    canvas.drawCircle(0, 0, R, d.accent)
    clipHead(canvas)
    canvas.drawOval({ x: -R + 2, y: 0, width: R * 2 + 6, height: R * 1.6 }, d.white)
    canvas.drawCircle(-R * 1.5, R * 0.1, R * 1.05, d.accentShade)
    canvas.restore()
    canvas.drawCircle(0, 0, R, d.outline)
    for (const e of [NEAR, FAR]) {
      const r = e.rx + 4
      canvas.drawCircle(e.x, e.y - 4, r, d.yellow)
      canvas.drawCircle(e.x, e.y - 4, r, d.thinOutline)
      xEye(canvas, d, e.x, e.y - 4, r * 0.45)
    }
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
    // Ojos en X gordos y una sonrisa ancha, todo en negro macizo.
    for (const [ex, sz] of [
      [FAR.x, 5],
      [NEAR.x, 6.5],
    ]) {
      canvas.drawLine(ex - sz, -6 - sz, ex + sz, -6 + sz, d.fat)
      canvas.drawLine(ex - sz, -6 + sz, ex + sz, -6 - sz, d.fat)
    }
    canvas.drawArc({ x: -10, y: 0, width: 34, height: 22 }, 20, 140, false, d.fat)
    return true
  }
  return false
}

/** Chistera negra con su cinta. */
function drawHat(canvas: SkCanvas, d: DjPaints): void {
  'worklet'
  if (d.look.hat !== 'tophat') return
  canvas.drawRRect({ rect: { x: -R - 10, y: -R + 2, width: R * 2 + 22, height: 10 }, rx: 5, ry: 5 }, d.hatBlack)
  canvas.drawRRect({ rect: { x: -R - 10, y: -R + 2, width: R * 2 + 22, height: 10 }, rx: 5, ry: 5 }, d.thinOutline)
  canvas.drawRRect({ rect: { x: -R + 4, y: -R - 34, width: R * 2 - 4, height: 38 }, rx: 6, ry: 6 }, d.hatBlack)
  canvas.drawRRect({ rect: { x: -R + 4, y: -R - 34, width: R * 2 - 4, height: 38 }, rx: 6, ry: 6 }, d.thinOutline)
  canvas.drawRect({ x: -R + 5, y: -R - 6, width: R * 2 - 6, height: 6 }, d.dark)
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
      // Un rombo azul con borde dorado alrededor de cada ojo.
      const k = e === NEAR ? 1 : 0.8
      const p = Skia.Path.Make()
      p.moveTo(e.x, e.y - 14 * k)
      p.lineTo(e.x + 11 * k, e.y)
      p.lineTo(e.x, e.y + 10 * k)
      p.lineTo(e.x - 11 * k, e.y)
      p.close()
      canvas.drawPath(p, d.accent)
      canvas.drawPath(p, d.goldStroke)
      canvas.drawOval({ x: e.x - e.rx + 1, y: e.y - 3, width: e.rx * 2 - 2, height: 6 }, d.dark)
    }
    // Sonrisa roja de máscara, de comisura a comisura.
    canvas.drawArc({ x: -2, y: 8, width: 22, height: 12 }, 25, 130, true, d.red)
    canvas.drawCircle(0, 0, R, d.outline)
    canvas.restore()
    return
  }

  if (l.facialHair === 'stubble') band(canvas, -R, 6, R * 2, R, d.stubble)
  else if (l.facialHair === 'goatee') {
    // Perilla: la barbilla, un poco más marcada que una barba de tres días.
    canvas.drawOval({ x: 0, y: 20, width: 18, height: 13 }, d.stubble)
    canvas.drawOval({ x: 0, y: 20, width: 18, height: 13 }, d.stubble)
    band(canvas, -R, 10, R * 2, R, d.stubble)
  }
  else if (l.facialHair === 'beard') band(canvas, -R, 8, R * 2, R, d.hair)

  // Mofletes, salvo que la barba o el buff los tapen.
  if (l.facialHair !== 'beard' && l.mask !== 'buff') {
    canvas.drawOval({ x: 14, y: 6, width: 14, height: 8 }, d.cheek)
    canvas.drawOval({ x: -12, y: 6, width: 10, height: 7 }, d.cheek)
  }

  eye(canvas, d, FAR, lx, ly)
  eye(canvas, d, NEAR, lx, ly)
  if (l.hair === 'fringe') drawFringe(canvas, d)
  if (l.eyeliner) {
    for (const e of [NEAR, FAR]) canvas.drawLine(e.x + e.rx - 1, e.y - 3, e.x + e.rx + 5, e.y - 8, d.line)
  }

  if (l.mask === 'beak') {
    // Antifaz dorado de pájaro sobre los ojos, con el pico hacia delante.
    band(canvas, -R, -18, R * 2, 22, d.gold, d.thinOutline)
    canvas.drawOval({ x: NEAR.x - 5, y: -10, width: 10, height: 9 }, d.dark)
    canvas.drawOval({ x: FAR.x - 4, y: -10, width: 8, height: 8 }, d.dark)
    // El pico largo, que cae hacia abajo por delante de la barba.
    const beak = Skia.Path.Make()
    beak.moveTo(4, -6)
    beak.quadTo(R * 0.95, -2, R * 0.75, R + 18)
    beak.quadTo(R * 0.25, 10, 0, 2)
    beak.close()
    canvas.drawPath(beak, d.gold)
    canvas.drawPath(beak, d.thinOutline)
    canvas.drawCircle(0, 0, R, d.outline)
    drawHat(canvas, d)
    canvas.restore()
    return
  }

  const g = l.glasses
  if (g === 'rect') {
    for (const e of [NEAR, FAR]) {
      canvas.drawRRect({ rect: { x: e.x - e.rx - 4, y: e.y - 8, width: e.rx * 2 + 8, height: 15 }, rx: 3, ry: 3 }, d.line)
    }
    canvas.drawLine(FAR.x + FAR.rx + 4, -3, NEAR.x - NEAR.rx - 4, -3, d.line)
  } else if (g === 'thick') {
    // Gafas de pasta gruesas, negras.
    for (const e of [NEAR, FAR]) {
      canvas.drawRRect({ rect: { x: e.x - e.rx - 5, y: e.y - 9, width: e.rx * 2 + 10, height: 16 }, rx: 3, ry: 3 }, d.fat)
    }
    canvas.drawLine(FAR.x + FAR.rx + 5, -5, NEAR.x - NEAR.rx - 5, -5, d.fat)
  } else if (g === 'round') {
    canvas.drawCircle(NEAR.x, NEAR.y, NEAR.rx + 4, d.line)
    canvas.drawCircle(FAR.x, FAR.y, FAR.rx + 3, d.line)
  }

  brows(canvas, d)

  if (l.mask === 'buff') {
    // Pañuelo hasta la nariz, negro con estampado blanco (como el suyo). Sin
    // sombra encima: sobre tela negra se leía como una franja vertical rara.
    clipHead(canvas)
    const cloth = Skia.Path.Make()
    cloth.moveTo(-R - 2, 6)
    cloth.quadTo(10, -4, R + 2, 2)
    cloth.lineTo(R + 2, R + 2)
    cloth.lineTo(-R - 2, R + 2)
    cloth.close()
    canvas.drawPath(cloth, d.accent)
    canvas.drawPath(cloth, d.thinOutline)
    // El estampado: unas florecillas y puntos blancos.
    for (const [px, py, r] of [
      [-12, 18, 5],
      [12, 14, 6],
      [26, 22, 4],
      [0, 28, 4],
      [-24, 26, 3],
    ]) {
      canvas.drawCircle(px, py, r, d.paisley)
      canvas.drawCircle(px, py, r * 0.4, d.accent)
    }
    canvas.restore()
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
  if (l.hair === 'bobCenter') drawCurtains(canvas, d)
  if (l.hair === 'quiff') {
    // El tupé: un mechón que sube por delante, por encima de la cabeza.
    const t = Skia.Path.Make()
    t.moveTo(-14, -R + 6)
    t.quadTo(-6, -R - 14, 18, -R - 10)
    t.quadTo(R - 2, -R - 4, R - 4, -R + 14)
    t.close()
    canvas.drawPath(t, d.hair)
    canvas.drawPath(t, d.thinOutline)
  }
  drawHat(canvas, d)
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
