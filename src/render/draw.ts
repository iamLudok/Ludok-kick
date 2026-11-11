/**
 * Todo lo que se ve del partido se pinta aquí, a mano y por código: no hay
 * sprites. Cada cosa tiene su función (`drawPlayer`, `drawVinyl`…) que recibe
 * el estado y decide cómo se ve; el día que haya sprites, se cambia el cuerpo
 * de esas funciones y el resto del juego no se entera.
 *
 * Los pinceles se crean una sola vez en `createPainter` y se reutilizan: crear
 * objetos de Skia en cada frame es lo primero que tira los fps.
 */
import {
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  createPicture,
  matchFont,
  type SkCanvas,
  type SkFont,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia'
import { BALL, FIELD, GOAL, KICK, PLAYER } from '../game/constants'
import { kickAngle } from '../game/step'
import type { GameState, InputFrame, Judge, PlayerState, PowerKind } from '../game/types'
import { palette } from '../ui/theme'
import type { DjLook } from '../content/djs'
import { createDjPaints, drawHead, type DjPaints } from './characters'
import { drawDecor } from './decor'
import type { StageDecor, StagePalette } from './stage'
import { fitWorld, layoutControls, type ControlsLayout, type Point, type View } from './view'

type Bounds = { x: number; y: number; width: number; height: number }

/** Un cartel de PERFECT o GOOD flotando donde se tocó el vinilo. */
/**
 * Un cartel flotando: un remate a tiempo o un poder lanzado. `label` es el
 * índice en LABELS: 0 GOOD, 1 PERFECT, 2–5 los poderes.
 */
export type Fx = { label: number; x: number; y: number; age: number }

/** El cartel de cada juicio y de cada poder. */
export function judgeLabel(judge: Judge): number {
  'worklet'
  return judge === 2 ? 1 : 0
}

export function powerLabel(kind: PowerKind): number {
  'worklet'
  return kind === 'scratch' ? 2 : kind === 'lowpass' ? 3 : kind === 'loop' ? 4 : 5
}

/** Segundos que dura un cartel en pantalla. */
export const FX_LIFE = 0.75

/** Lo que el dibujo necesita saber del ritmo en este frame. */
export type BeatView = {
  /** 0 justo en el beat, casi 1 justo antes del siguiente; -1 si no hay música. */
  phase: number
  fx: Fx[]
  /** La onda del último drop: dónde nació y cuánto hace (segundos); edad -1 si no hay. */
  shock: { x: number; y: number; age: number }
}

/** Lo que dura la onda del drop y la sacudida de cámara. */
export const SHOCK_LIFE = 0.7
/** Cuánto se mueve la cámara al caer el drop, en dp. */
const SHAKE_DP = 9

export type Painter = {
  view: View
  controls: ControlsLayout
  bounds: Bounds
  /** Lo que no cambia nunca (pared, suelo, porterías), grabado una sola vez. */
  background: SkPicture
  blank: SkPicture
  shadow: SkPaint
  outline: SkPaint
  thinOutline: SkPaint
  white: SkPaint
  /** Pinceles de cada DJ: el de la izquierda y el de la derecha. */
  djs: [DjPaints, DjPaints]
  dark: SkPaint
  vinyl: SkPaint
  vinylRim: SkPaint
  vinylGroove: SkPaint
  vinylLabel: SkPaint
  vinylMark: SkPaint
  vinylShine: SkPaint
  button: SkPaint
  buttonOn: SkPaint
  buttonRing: SkPaint
  icon: SkPaint
  icons: { left: SkPath; right: SkPath; jump: SkPath; kick: SkPath }
  cone: SkPaint
  coneRing: SkPaint
  coneDome: SkPaint
  /** Estos cuatro cambian de transparencia en cada frame, al son del beat. */
  floorPulse: SkPaint
  beatRing: SkPaint
  beatFlash: SkPaint
  burst: SkPaint
  shockRing: SkPaint
  shockFlash: SkPaint
  freezeScrim: SkPaint
  sideFill: SkPaint
  font: SkFont
  textOutline: SkPaint
  textFill: SkPaint[]
  /** Ancho de cada cartel, para centrarlo. */
  textWidth: number[]
  /** El botón de poder: anillo de energía, relleno cuando hay poder y el icono de cada uno. */
  energyRing: SkPaint
  powerFill: SkPaint
  iconStroke: SkPaint
  powerIcons: Record<PowerKind, SkPath>
  /** Efectos de los poderes en marcha. */
  slowTint: SkPaint
  slowLine: SkPaint
  scratchArc: SkPaint
  curveGlow: SkPaint
  loopArc: SkPaint
}

const LABELS = ['GOOD', 'PERFECT', 'SCRATCH', 'LOW-PASS', 'LOOP', 'CUE']

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

/** Polígono cerrado con los puntos dados como [x0, y0, x1, y1, …]. */
function polygon(points: number[], at: Point = { x: 0, y: 0 }, size = 1): SkPath {
  const path = Skia.Path.Make()
  for (let i = 0; i < points.length; i += 2) {
    const x = at.x + points[i] * size
    const y = at.y + points[i + 1] * size
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.close()
  return path
}

/* --- Fondo: se graba una vez --------------------------------------------- */

function drawGoal(canvas: SkCanvas, st: StagePalette): void {
  // Portería izquierda; la derecha es esta misma, espejada.
  const barY = FIELD.GROUND_Y - GOAL.HEIGHT
  const backY = barY - GOAL.ROOF_RISE
  canvas.drawPath(polygon([0, backY, GOAL.DEPTH, barY, GOAL.DEPTH, FIELD.GROUND_Y, 0, FIELD.GROUND_Y]), fill(st.cabinet))

  // El techo se pinta con el mismo grosor con el que choca: lo que se ve es
  // exactamente contra lo que rebota el vinilo.
  canvas.drawLine(0, backY, GOAL.DEPTH, barY, stroke(st.outline, GOAL.BAR_R * 2 + 4))
  canvas.drawLine(0, backY, GOAL.DEPTH, barY, stroke(st.bar, GOAL.BAR_R * 2))
}

function recordBackground(v: View, st: StagePalette, decor: StageDecor, bounds: Bounds): SkPicture {
  return createPicture((canvas) => {
    const groundY = v.oy + FIELD.GROUND_Y * v.scale

    // El degradado va del techo del campo al suelo, no de la pantalla: así el
    // horizonte del atardecer cae siempre a la misma altura del campo.
    const wall = Skia.Paint()
    wall.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: 0, y: v.oy },
        { x: 0, y: groundY },
        st.wall.map((c) => Skia.Color(c)),
        null,
        TileMode.Clamp,
      ),
    )
    canvas.drawRect({ x: 0, y: 0, width: v.sw, height: groundY }, wall)

    canvas.save()
    canvas.translate(v.ox, v.oy)
    canvas.scale(v.scale, v.scale)

    drawDecor(canvas, decor, st)

    // Haces de los focos, muy tenues: dan ambiente sin competir con el vinilo.
    const beam = fill(st.beam)
    beam.setAlphaf(0.07)
    const lamp = fill(st.trussLine)
    for (const x of [200, 400, 600, 800]) {
      canvas.drawPath(polygon([x - 8, 8, x + 8, 8, x + 95, FIELD.GROUND_Y, x - 95, FIELD.GROUND_Y]), beam)
      canvas.drawRect({ x: x - 12, y: 0, width: 24, height: 8 }, lamp)
    }

    // El techo del campo es un truss de luces: así se entiende que el vinilo
    // rebote ahí arriba. Queda justo por encima de y = 0 para no tapar el
    // vinilo cuando toca techo; en pantallas donde el campo llena todo el alto
    // no se ve, y entonces el techo es el borde de la pantalla.
    canvas.drawRect({ x: 0, y: -400, width: FIELD.W, height: 400 }, fill(st.truss))
    const trussLine = stroke(st.trussLine, 1.5)
    for (let x = 0; x < FIELD.W; x += 40) {
      canvas.drawLine(x, -13, x + 20, -1, trussLine)
      canvas.drawLine(x + 20, -1, x + 40, -13, trussLine)
    }
    canvas.drawLine(0, -1, FIELD.W, -1, trussLine)

    drawGoal(canvas, st)
    canvas.save()
    canvas.translate(FIELD.W, 0)
    canvas.scale(-1, 1)
    drawGoal(canvas, st)
    canvas.restore()

    canvas.restore()

    // Suelo: baja hasta el final de la pantalla porque ahí van los botones.
    canvas.drawRect({ x: 0, y: groundY, width: v.sw, height: v.sh - groundY }, fill(st.floor))
    const mark = fill(st.floorMark)
    canvas.drawRect({ x: v.sw / 2 - 1.5, y: groundY, width: 3, height: 14 * v.scale }, mark)
    for (const lineX of [GOAL.DEPTH, FIELD.W - GOAL.DEPTH]) {
      canvas.drawRect({ x: v.ox + lineX * v.scale - 1.5, y: groundY, width: 3, height: 14 * v.scale }, mark)
    }
    canvas.drawRect({ x: 0, y: groundY, width: v.sw, height: 3 }, fill(st.floorEdge))

    // Lo que sobra a los lados en pantallas más anchas que el campo.
    if (v.ox > 0) {
      const side = fill(st.side)
      canvas.drawRect({ x: 0, y: 0, width: v.ox, height: groundY }, side)
      canvas.drawRect({ x: v.sw - v.ox, y: 0, width: v.ox, height: groundY }, side)
    }
  }, bounds)
}

/**
 * Los iconos de los poderes, geométricos como los del resto de botones. Van
 * de trazo: un filtro, una flecha en bucle… se leen mejor como líneas.
 */
function powerIcons(c: Point, r: number): Record<PowerKind, SkPath> {
  const s = r * 0.42
  // Scratch: el vaivén de la mano sobre el plato, un zigzag.
  const scratch = Skia.Path.Make()
  scratch.moveTo(c.x - s, c.y + s * 0.5)
  scratch.lineTo(c.x - s * 0.35, c.y - s * 0.6)
  scratch.lineTo(c.x + s * 0.2, c.y + s * 0.6)
  scratch.lineTo(c.x + s, c.y - s * 0.5)
  // Low-pass: la curva de un filtro, plana y luego cayendo.
  const lowpass = Skia.Path.Make()
  lowpass.moveTo(c.x - s, c.y - s * 0.35)
  lowpass.lineTo(c.x + s * 0.1, c.y - s * 0.35)
  lowpass.quadTo(c.x + s * 0.55, c.y - s * 0.35, c.x + s, c.y + s * 0.7)
  // Loop: una vuelta casi entera con su punta de flecha.
  const loop = Skia.Path.Make()
  loop.addArc({ x: c.x - s * 0.8, y: c.y - s * 0.8, width: s * 1.6, height: s * 1.6 }, -60, 290)
  loop.moveTo(c.x + s * 0.4, c.y - s * 1.05)
  loop.lineTo(c.x + s * 0.45, c.y - s * 0.65)
  loop.lineTo(c.x + s * 0.05, c.y - s * 0.55)
  // Cue: volver al principio, una barra y un triángulo hacia ella.
  const cue = Skia.Path.Make()
  cue.moveTo(c.x - s * 0.7, c.y - s * 0.7)
  cue.lineTo(c.x - s * 0.7, c.y + s * 0.7)
  cue.moveTo(c.x + s * 0.7, c.y - s * 0.7)
  cue.lineTo(c.x - s * 0.3, c.y)
  cue.lineTo(c.x + s * 0.7, c.y + s * 0.7)
  cue.close()
  return { scratch, lowpass, loop, cue }
}

/**
 * El escenario entero en pequeño, para la pantalla de selección: el mismo
 * fondo que en el partido, sin jugadores ni botones.
 */
export function recordStagePreview(width: number, height: number, stage: StageLook): SkPicture {
  const view = fitWorld(width, height, 0)
  return recordBackground(view, stage.palette, stage.decor, { x: 0, y: 0, width, height })
}

/** Lo que hace falta del escenario para pintarlo. */
export type StageLook = { palette: StagePalette; decor: StageDecor }

export function createPainter(sw: number, sh: number, insetX: number, stage: StageLook, djs: [DjLook, DjLook]): Painter {
  const st = stage.palette
  const view = fitWorld(sw, sh, insetX)
  const controls = layoutControls(view, insetX)
  const bounds = { x: 0, y: 0, width: sw, height: sh }
  const r = controls.r

  const shadow = fill('#000000')
  shadow.setAlphaf(0.35)
  const vinylShine = stroke('#ffffff', 2.5)
  vinylShine.setAlphaf(0.35)
  const font = matchFont({ fontFamily: 'sans-serif', fontSize: 26, fontWeight: '900', fontStyle: 'italic' })
  const textOutline = stroke(st.outline, 5)

  return {
    view,
    controls,
    bounds,
    background: recordBackground(view, st, stage.decor, bounds),
    blank: createPicture(() => {}, bounds),
    shadow,
    outline: stroke(st.outline, 3),
    thinOutline: stroke(st.outline, 2),
    white: fill('#ffffff'),
    dark: fill(st.outline),
    djs: [createDjPaints(djs[0], st.outline), createDjPaints(djs[1], st.outline)],
    vinyl: fill('#08060c'),
    vinylRim: stroke(st.vinylRim, 2),
    vinylGroove: stroke(st.vinylGroove, 1.2),
    vinylLabel: fill(st.vinylLabel),
    vinylMark: stroke('#ffffff', 2),
    vinylShine,
    button: fill('rgba(255,255,255,0.10)'),
    buttonOn: fill('rgba(122,69,196,0.75)'),
    buttonRing: stroke('rgba(255,255,255,0.35)', 2),
    icon: fill(palette.fg),
    icons: {
      left: polygon([-0.4, 0, 0.22, -0.42, 0.22, 0.42], controls.left, r),
      right: polygon([0.4, 0, -0.22, -0.42, -0.22, 0.42], controls.right, r),
      jump: polygon([0, -0.42, 0.42, 0.2, -0.42, 0.2], controls.jump, r),
      // Una bota de perfil.
      kick: polygon([-0.3, -0.42, 0.02, -0.42, 0.02, 0.04, 0.42, 0.18, 0.42, 0.4, -0.3, 0.4], controls.kick, r),
    },
    cone: fill(st.cone),
    coneRing: stroke(st.coneRing, 2.5),
    coneDome: fill(st.coneRing),
    floorPulse: fill(st.beatGlow),
    beatRing: stroke(st.beatGlow, 3),
    beatFlash: stroke('#ffffff', 4),
    burst: stroke(st.perfect, 4),
    shockRing: stroke(st.beatGlow, 14),
    shockFlash: fill('#ffffff'),
    freezeScrim: fill('#05030a'),
    sideFill: fill(st.side),
    font,
    textOutline,
    textFill: LABELS.map((_, i) => fill(i === 0 ? st.good : i === 1 ? st.perfect : st.power)),
    textWidth: LABELS.map((l) => font.measureText(l).width),
    energyRing: stroke(st.power, 5),
    powerFill: fill(st.power),
    iconStroke: stroke(palette.fg, Math.max(3, controls.powerR * 0.12)),
    powerIcons: powerIcons(controls.power, controls.powerR),
    slowTint: fill(st.slow),
    slowLine: stroke(st.slow, 3),
    scratchArc: stroke(st.power, 4),
    curveGlow: stroke(st.power, 4),
    loopArc: stroke(st.beatGlow, 3),
  }
}

/* --- Cada frame ---------------------------------------------------------- */

function oval(canvas: SkCanvas, cx: number, cy: number, rx: number, ry: number, paint: SkPaint): void {
  'worklet'
  canvas.drawOval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }, paint)
}

function drawShadow(canvas: SkCanvas, k: Painter, x: number, y: number, width: number): void {
  'worklet'
  // Cuanto más alto está, más pequeña la sombra: es la pista que usa el ojo
  // para saber dónde va a caer algo.
  const height = FIELD.GROUND_Y - y
  const w = width * Math.max(0.35, 1 - height / 320)
  oval(canvas, x, FIELD.GROUND_Y + 4, w, 5, k.shadow)
}

function drawShoe(canvas: SkCanvas, k: Painter, x: number, y: number, facing: number, angleDeg: number): void {
  'worklet'
  canvas.save()
  canvas.translate(x, y)
  canvas.rotate(angleDeg, 0, 0)
  oval(canvas, facing * 3, 0, 15, 9, k.white)
  oval(canvas, facing * 3, 0, 15, 9, k.thinOutline)
  canvas.restore()
}

function drawPlayer(canvas: SkCanvas, k: Painter, p: PlayerState, ahead: number, ballX: number, ballY: number): void {
  'worklet'
  const d = k.djs[p.side]
  const f = p.facing
  const x = p.x + p.vx * ahead
  const y = Math.min(p.y + p.vy * ahead, FIELD.GROUND_Y)

  // Pie de apoyo, detrás del cuerpo.
  drawShoe(canvas, k, x - f * 11, y - 8, f, 0)

  canvas.drawRRect({ rect: { x: x - 15, y: y - 38, width: 30, height: 30 }, rx: 9, ry: 9 }, d.jersey)
  canvas.drawRRect({ rect: { x: x - 15, y: y - 38, width: 30, height: 30 }, rx: 9, ry: 9 }, k.outline)

  // Pie que chuta: en reposo descansa en el suelo; durante el barrido sigue
  // exactamente el mismo arco que usa la física para golpear.
  if (p.kickT >= 0) {
    const a = kickAngle(p)
    const fx = x + f * Math.sin(a) * KICK.LEG
    const fy = y - KICK.HIP_Y + Math.cos(a) * KICK.LEG
    canvas.drawLine(x + f * 4, y - 26, fx, fy, d.leg)
    drawShoe(canvas, k, fx, fy, f, (-a * f * 180) / Math.PI)
  } else {
    drawShoe(canvas, k, x + f * 11, y - 8, f, 0)
  }

  drawHead(canvas, d, x, y - PLAYER.HEAD_CY, f, ballX, ballY)
}

function drawVinyl(canvas: SkCanvas, k: Painter, x: number, y: number, angle: number): void {
  'worklet'
  const R = BALL.R
  canvas.save()
  canvas.translate(x, y)
  canvas.rotate((angle * 180) / Math.PI, 0, 0)
  canvas.drawCircle(0, 0, R, k.vinyl)
  canvas.drawCircle(0, 0, R * 0.78, k.vinylGroove)
  canvas.drawCircle(0, 0, R * 0.6, k.vinylGroove)
  // El brillo y la marca de la etiqueta giran con el disco: sin ellos un
  // círculo negro girando no se distingue de uno parado.
  canvas.drawArc({ x: -R * 0.7, y: -R * 0.7, width: R * 1.4, height: R * 1.4 }, -70, 50, false, k.vinylShine)
  canvas.drawArc({ x: -R * 0.7, y: -R * 0.7, width: R * 1.4, height: R * 1.4 }, 110, 50, false, k.vinylShine)
  canvas.drawCircle(0, 0, R * 0.4, k.vinylLabel)
  canvas.drawLine(R * 0.14, 0, R * 0.32, 0, k.vinylMark)
  canvas.drawCircle(0, 0, 1.6, k.vinyl)
  // Borde claro: el disco es negro y el fondo oscuro; sin borde se pierde.
  canvas.drawCircle(0, 0, R - 1, k.vinylRim)
  canvas.restore()
}

/** Los conos de los bafles-portería, que se hinchan con cada bombo. */
function drawCones(canvas: SkCanvas, k: Painter, pulse: number): void {
  'worklet'
  const barY = FIELD.GROUND_Y - GOAL.HEIGHT
  const grow = 1 + pulse * 0.14
  for (let side = 0; side < 2; side++) {
    const cx = side === 0 ? GOAL.DEPTH * 0.46 : FIELD.W - GOAL.DEPTH * 0.46
    for (let i = 0; i < 2; i++) {
      const cy = barY + (i === 0 ? 46 : 108)
      const r = (i === 0 ? 24 : 29) * grow
      canvas.drawCircle(cx, cy, r, k.cone)
      canvas.drawCircle(cx, cy, r, k.coneRing)
      canvas.drawCircle(cx, cy, r * 0.62, k.coneRing)
      canvas.drawCircle(cx, cy, r * 0.26 * (1 + pulse * 0.5), k.coneDome)
    }
  }
}

/**
 * El anillo que se cierra sobre tu jugador: llega a la cabeza justo en el
 * beat. Es la señal para rematar a tiempo sin apartar la vista del muñeco.
 */
function drawBeatRing(canvas: SkCanvas, k: Painter, x: number, y: number, phase: number, pulse: number): void {
  'worklet'
  const cy = y - PLAYER.HEAD_CY
  const edge = PLAYER.HEAD_R + 5
  k.beatRing.setAlphaf(0.15 + 0.65 * phase)
  canvas.drawCircle(x, cy, edge + 46 * (1 - phase), k.beatRing)
  if (pulse > 0.05) {
    k.beatFlash.setAlphaf(pulse)
    canvas.drawCircle(x, cy, edge, k.beatFlash)
  }
}

function drawFx(canvas: SkCanvas, k: Painter, fx: Fx): void {
  'worklet'
  const t = fx.age / FX_LIFE
  const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
  const i = fx.label

  if (i === 1) {
    k.burst.setAlphaf(1 - t)
    canvas.drawCircle(fx.x, fx.y, BALL.R + 70 * t, k.burst)
  } else if (i >= 2) {
    // Un poder: un anillo más grande, del color de los poderes.
    k.curveGlow.setAlphaf(1 - t)
    canvas.drawCircle(fx.x, fx.y, PLAYER.HEAD_R + 90 * t, k.curveGlow)
  }
  // Sale un poco grande y se asienta: se nota más que si apareciera ya quieto.
  const pop = 1 + 0.5 * Math.max(0, 1 - fx.age / 0.12)
  // Los carteles no se salen del campo aunque el toque sea pegado a una pared.
  const half = (k.textWidth[i] * pop) / 2
  const x = Math.min(Math.max(fx.x, half + 8), FIELD.W - half - 8)
  const y = Math.max(fx.y - 44 - 46 * t, 34)
  canvas.save()
  canvas.translate(x, y)
  canvas.scale(pop, pop)
  k.textOutline.setAlphaf(fade)
  k.textFill[i].setAlphaf(fade)
  canvas.drawText(LABELS[i], -k.textWidth[i] / 2, 0, k.textOutline, k.font)
  canvas.drawText(LABELS[i], -k.textWidth[i] / 2, 0, k.textFill[i], k.font)
  canvas.restore()
}

/** Lo que se ve de los poderes en marcha, encima del jugador y del vinilo. */
function drawPowerEffects(canvas: SkCanvas, k: Painter, s: GameState, ahead: number, bx: number, by: number): void {
  'worklet'
  const spin = s.tick / 120
  for (let i = 0; i < 2; i++) {
    const p = s.players[i]
    const x = p.x + p.vx * ahead
    const cy = Math.min(p.y + p.vy * ahead, FIELD.GROUND_Y) - PLAYER.HEAD_CY
    if (p.slowT > 0) {
      // Low-pass: tinte frío y unas líneas de estela, como a cámara lenta.
      k.slowTint.setAlphaf(0.32)
      canvas.drawCircle(x, cy, PLAYER.HEAD_R + 2, k.slowTint)
      k.slowLine.setAlphaf(0.6)
      for (let j = 0; j < 3; j++) {
        const ly = cy - 18 + j * 18
        const back = -p.facing
        canvas.drawLine(x + back * (PLAYER.HEAD_R + 8), ly, x + back * (PLAYER.HEAD_R + 30), ly, k.slowLine)
      }
    }
    if (p.scratch) {
      // Scratch preparado: dos arcos girando alrededor de la cabeza.
      const r = PLAYER.HEAD_R + 9
      const a = (spin * 540) % 360
      const box = { x: x - r, y: cy - r, width: r * 2, height: r * 2 }
      canvas.drawArc(box, a, 70, false, k.scratchArc)
      canvas.drawArc(box, a + 180, 70, false, k.scratchArc)
    }
  }
  const b = s.ball
  if (b.curveT > 0) {
    k.curveGlow.setAlphaf(0.85)
    canvas.drawCircle(bx, by, BALL.R + 6, k.curveGlow)
  }
  if (b.loopT > 0) {
    // Loop: tres arcos girando alrededor del vinilo quieto.
    const r = BALL.R + 10
    const a = (spin * 360) % 360
    const box = { x: bx - r, y: by - r, width: r * 2, height: r * 2 }
    for (let j = 0; j < 3; j++) canvas.drawArc(box, a + j * 120, 60, false, k.loopArc)
  }
}

/**
 * El botón de poder: sin poder, un círculo apagado con un anillo que se va
 * llenando con la energía; con poder, se enciende y enseña cuál es.
 */
function drawPowerButton(canvas: SkCanvas, k: Painter, p: PlayerState, pressed: boolean, tick: number): void {
  'worklet'
  const c = k.controls.power
  const r = k.controls.powerR
  if (p.power === null) {
    canvas.drawCircle(c.x, c.y, r, k.button)
    canvas.drawCircle(c.x, c.y, r, k.buttonRing)
    if (p.energy > 0) {
      k.energyRing.setAlphaf(0.9)
      canvas.drawArc({ x: c.x - r, y: c.y - r, width: r * 2, height: r * 2 }, -90, 360 * p.energy, false, k.energyRing)
    }
    return
  }
  // Late un poco para llamar la atención: hay algo listo para usar.
  const beat = 1 + 0.06 * Math.sin(tick / 16)
  k.powerFill.setAlphaf(pressed ? 0.6 : 1)
  canvas.drawCircle(c.x, c.y, r * beat, k.powerFill)
  canvas.drawCircle(c.x, c.y, r * beat, k.buttonRing)
  canvas.drawPath(k.powerIcons[p.power], k.iconStroke)
}

function drawButton(canvas: SkCanvas, k: Painter, at: Point, icon: SkPath, pressed: boolean): void {
  'worklet'
  canvas.drawCircle(at.x, at.y, k.controls.r, pressed ? k.buttonOn : k.button)
  canvas.drawCircle(at.x, at.y, k.controls.r, k.buttonRing)
  canvas.drawPath(icon, k.icon)
}

export function drawFrame(
  canvas: SkCanvas,
  s: GameState,
  k: Painter,
  touch: InputFrame,
  showControls: boolean,
  beat: BeatView,
): void {
  'worklet'
  const v = k.view
  const shock = beat.shock

  // La sacudida de cámara mueve todo menos los botones. Es una oscilación que
  // se apaga: fuerte en el instante del drop y quieta a los 0,7 s.
  canvas.save()
  if (shock.age >= 0 && shock.age < SHOCK_LIFE) {
    const fade = 1 - shock.age / SHOCK_LIFE
    const amp = SHAKE_DP * fade * fade
    // Lo que deja al descubierto el movimiento, del color de los lados.
    canvas.drawRect({ x: 0, y: 0, width: v.sw, height: v.sh }, k.sideFill)
    canvas.translate(Math.sin(shock.age * 71) * amp, Math.cos(shock.age * 53) * amp)
  }
  canvas.drawPicture(k.background)

  // Un destello que nace en cada beat y se apaga enseguida.
  const pulse = beat.phase >= 0 ? Math.exp(-beat.phase * 6) : 0
  if (pulse > 0.02) {
    const groundY = v.oy + FIELD.GROUND_Y * v.scale
    k.floorPulse.setAlphaf(pulse)
    canvas.drawRect({ x: 0, y: groundY - pulse * 3, width: v.sw, height: 3 + pulse * 6 }, k.floorPulse)
  }

  // La simulación va a pasos fijos y casi nunca coincide con el instante del
  // frame. Se pinta «un poco por delante», lo que quede sin simular: sin esto
  // el movimiento da tironcitos aunque vaya a 60 fps clavados.
  const ahead = s.phase === 'play' || s.phase === 'drop' ? s.acc : 0
  const b = s.ball
  const bx = b.x + b.vx * ahead
  const by = Math.min(b.y + b.vy * ahead, FIELD.GROUND_Y - BALL.R)

  canvas.save()
  canvas.translate(v.ox, v.oy)
  canvas.scale(v.scale, v.scale)

  drawCones(canvas, k, pulse)

  for (let i = 0; i < 2; i++) {
    const p = s.players[i]
    drawShadow(canvas, k, p.x + p.vx * ahead, p.y, 32)
  }
  if (beat.phase >= 0 && s.phase !== 'ended') {
    const me = s.players[0]
    drawBeatRing(canvas, k, me.x + me.vx * ahead, Math.min(me.y + me.vy * ahead, FIELD.GROUND_Y), beat.phase, pulse)
  }
  drawShadow(canvas, k, bx, by + BALL.R, 20)

  drawPlayer(canvas, k, s.players[1], ahead, bx, by)
  drawPlayer(canvas, k, s.players[0], ahead, bx, by)
  drawVinyl(canvas, k, bx, by, b.angle + b.spin * ahead)
  drawPowerEffects(canvas, k, s, ahead, bx, by)
  for (let i = 0; i < beat.fx.length; i++) drawFx(canvas, k, beat.fx[i])

  if (shock.age >= 0 && shock.age < SHOCK_LIFE) {
    // La onda: un anillo que crece desde quien marcó y se va apagando.
    const t = shock.age / SHOCK_LIFE
    const ease = 1 - (1 - t) * (1 - t)
    k.shockRing.setAlphaf(1 - t)
    k.shockRing.setStrokeWidth(4 + 18 * (1 - t))
    canvas.drawCircle(shock.x, shock.y, PLAYER.HEAD_R + 520 * ease, k.shockRing)
  }

  canvas.restore()

  // Congelado esperando el drop: el campo se apaga para que se note la pausa.
  if (s.phase === 'goal') {
    k.freezeScrim.setAlphaf(0.45)
    canvas.drawRect({ x: 0, y: 0, width: v.sw, height: v.sh }, k.freezeScrim)
  }
  // Y en el drop, un fogonazo que dura un suspiro.
  if (shock.age >= 0 && shock.age < 0.15) {
    k.shockFlash.setAlphaf(0.35 * (1 - shock.age / 0.15))
    canvas.drawRect({ x: 0, y: 0, width: v.sw, height: v.sh }, k.shockFlash)
  }
  canvas.restore()

  if (showControls) {
    const c = k.controls
    drawButton(canvas, k, c.left, k.icons.left, touch.move < 0)
    drawButton(canvas, k, c.right, k.icons.right, touch.move > 0)
    drawButton(canvas, k, c.jump, k.icons.jump, touch.jump)
    drawButton(canvas, k, c.kick, k.icons.kick, touch.kick)
    drawPowerButton(canvas, k, s.players[0], touch.power, s.tick)
  }
}
