/**
 * Los decorados de fondo, uno por escenario, dibujados por código. Se graban
 * una sola vez al entrar al partido (ver `recordBackground`), así que pueden
 * tener detalle sin costar nada por frame.
 *
 * Todo va en coordenadas de campo (1000 × 345 hasta el suelo) y en tonos
 * apagados: el fondo no puede competir con el vinilo ni con los jugadores.
 */
import { PaintStyle, Skia, StrokeCap, type SkCanvas, type SkPaint } from '@shopify/react-native-skia'
import { FIELD } from '../game/constants'
import type { StageDecor, StagePalette } from './stage'

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

function poly(points: number[]) {
  const path = Skia.Path.Make()
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) path.moveTo(points[i], points[i + 1])
    else path.lineTo(points[i], points[i + 1])
  }
  path.close()
  return path
}

/** Un «azar» fijo por posición: el decorado sale igual cada vez. */
function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Bilbao: una nave industrial. deco = [marco de ventana, luz de sodio, vigas, óxido].
 */
function warehouse(canvas: SkCanvas, st: StagePalette): void {
  const [frameC, glowC, steelC, rustC] = st.deco
  const glow = fill(glowC, 0.16)
  const frame = stroke(frameC, 5)
  const mullion = stroke(frameC, 3)
  for (const x0 of [150, 425, 700]) {
    const w = 150
    const top = 46
    const bottom = 228
    // Ventanal con el arco de arriba rebajado, como las naves de la ría.
    const path = Skia.Path.Make()
    path.moveTo(x0, bottom)
    path.lineTo(x0, top + 30)
    path.quadTo(x0 + w / 2, top - 6, x0 + w, top + 30)
    path.lineTo(x0 + w, bottom)
    path.close()
    canvas.drawPath(path, glow)
    for (let i = 1; i < 4; i++) canvas.drawLine(x0 + (w * i) / 4, top + 14, x0 + (w * i) / 4, bottom, mullion)
    for (let j = 1; j < 5; j++) {
      const y = top + 30 + ((bottom - top - 30) * j) / 5
      canvas.drawLine(x0, y, x0 + w, y, mullion)
    }
    canvas.drawPath(path, frame)
  }
  const steel = fill(steelC)
  const rivet = fill(rustC)
  for (const x of [105, 370, 630, 895]) {
    canvas.drawRect({ x: x - 11, y: 0, width: 22, height: FIELD.GROUND_Y }, steel)
    canvas.drawRect({ x: x - 16, y: 0, width: 32, height: 6 }, steel)
    for (let y = 30; y < FIELD.GROUND_Y; y += 34) canvas.drawCircle(x, y, 2.2, rivet)
  }
  canvas.drawRect({ x: 0, y: 248, width: FIELD.W, height: 10 }, steel)
}

/**
 * Donostia: atardecer en la bahía. deco = [sol, mar, reflejo del mar, siluetas].
 */
function beach(canvas: SkCanvas, st: StagePalette): void {
  const [sunC, seaC, seaLightC, landC] = st.deco
  const horizon = 266
  canvas.drawCircle(650, horizon, 120, fill(sunC, 0.18))
  canvas.drawCircle(650, horizon, 62, fill(sunC))
  canvas.drawRect({ x: 0, y: horizon, width: FIELD.W, height: FIELD.GROUND_Y - horizon }, fill(seaC))
  // Ola a ola, el reflejo del sol se va estrechando hacia la orilla.
  const reflex = stroke(sunC, 3, 0.7)
  for (let i = 0; i < 6; i++) {
    const y = horizon + 8 + i * 11
    const w = 70 - i * 9
    canvas.drawLine(650 - w / 2, y, 650 + w / 2, y, reflex)
  }
  const light = stroke(seaLightC, 2, 0.5)
  for (let i = 0; i < 14; i++) {
    const x = hash(i) * FIELD.W
    const y = horizon + 10 + hash(i + 40) * 60
    canvas.drawLine(x, y, x + 18 + hash(i + 80) * 30, y, light)
  }
  const land = fill(landC)
  // Los montes a cada lado de la bahía y la isla en medio.
  canvas.drawPath(poly([0, horizon, 0, 196, 60, 184, 120, 200, 190, horizon]), land)
  canvas.drawPath(poly([820, horizon, 880, 214, 940, 202, 1000, 208, 1000, horizon]), land)
  canvas.drawPath(poly([300, horizon, 330, 246, 372, 232, 430, 236, 470, horizon]), land)
  // Unas gaviotas: dos trazos cada una.
  const gull = stroke(landC, 2.5, 0.8)
  for (const [gx, gy] of [
    [260, 120],
    [300, 98],
    [780, 140],
  ]) {
    canvas.drawLine(gx - 9, gy - 4, gx, gy, gull)
    canvas.drawLine(gx, gy, gx + 9, gy - 4, gull)
  }
}

/**
 * Caserío: un caserío vasco convertido en rave. deco = [piedra, madera, sombra de la madera, bombillas].
 */
function caserio(canvas: SkCanvas, st: StagePalette): void {
  const [stoneC, woodC, woodDarkC, bulbC] = st.deco
  // Muro de mampostería: piedras de tamaños distintos, fila a fila.
  const stone = stroke(stoneC, 2)
  let n = 0
  for (let y = 14; y < FIELD.GROUND_Y; y += 30) {
    let x = -hash(y) * 40
    while (x < FIELD.W) {
      const w = 48 + hash(n++) * 46
      canvas.drawRRect({ rect: { x: x + 3, y: y + 3, width: w - 6, height: 24 }, rx: 8, ry: 8 }, stone)
      x += w
    }
  }
  // La cercha de madera del tejado: dos pares, el tirante y el pendolón.
  const wood = stroke(woodC, 16)
  const woodDark = stroke(woodDarkC, 20)
  const beams: number[][] = [
    [500, 18, 70, 236],
    [500, 18, 930, 236],
    [210, 150, 790, 150],
    [500, 18, 500, 150],
  ]
  for (const [x1, y1, x2, y2] of beams) canvas.drawLine(x1, y1, x2, y2, woodDark)
  for (const [x1, y1, x2, y2] of beams) canvas.drawLine(x1, y1, x2, y2, wood)
  // Guirnaldas de bombillas colgando de la cercha.
  const wire = stroke(woodDarkC, 2)
  const bulbA = fill(bulbC)
  const bulbB = fill(st.beatGlow)
  for (const [x1, x2, sag] of [
    [90, 500, 70],
    [500, 910, 70],
  ]) {
    const y0 = 60
    const path = Skia.Path.Make()
    path.moveTo(x1, y0)
    path.quadTo((x1 + x2) / 2, y0 + sag * 2, x2, y0)
    canvas.drawPath(path, wire)
    for (let i = 1; i < 9; i++) {
      const t = i / 9
      const bx = x1 + (x2 - x1) * t
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0
      canvas.drawCircle(bx, by + 6, 5, i % 2 ? bulbA : bulbB)
    }
  }
}

export function drawDecor(canvas: SkCanvas, decor: StageDecor, st: StagePalette): void {
  if (decor === 'warehouse') warehouse(canvas, st)
  else if (decor === 'beach') beach(canvas, st)
  else caserio(canvas, st)
}
