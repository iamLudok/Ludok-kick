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
  type SkCanvas,
  type SkPaint,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia'
import { BALL, FIELD, GOAL, KICK, PLAYER } from '../game/constants'
import { kickAngle } from '../game/step'
import type { GameState, InputFrame, PlayerState } from '../game/types'
import { palette } from '../ui/theme'
import type { StagePalette } from './stage'
import { fitWorld, layoutControls, type ControlsLayout, type Point, type View } from './view'

type Bounds = { x: number; y: number; width: number; height: number }

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
  skin: SkPaint
  white: SkPaint
  dark: SkPaint
  band: SkPaint
  brow: SkPaint
  jersey: [SkPaint, SkPaint]
  leg: [SkPaint, SkPaint]
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

  // Dos conos de altavoz al fondo: la portería es una caja de bafle abierta.
  const cone = fill(st.cone)
  const ring = stroke(st.coneRing, 2.5)
  const dome = fill(st.coneRing)
  const cx = GOAL.DEPTH * 0.46
  for (const [cy, r] of [
    [barY + 46, 24],
    [barY + 108, 29],
  ]) {
    canvas.drawCircle(cx, cy, r, cone)
    canvas.drawCircle(cx, cy, r, ring)
    canvas.drawCircle(cx, cy, r * 0.62, ring)
    canvas.drawCircle(cx, cy, r * 0.26, dome)
  }

  // El techo se pinta con el mismo grosor con el que choca: lo que se ve es
  // exactamente contra lo que rebota el vinilo.
  canvas.drawLine(0, backY, GOAL.DEPTH, barY, stroke(st.outline, GOAL.BAR_R * 2 + 4))
  canvas.drawLine(0, backY, GOAL.DEPTH, barY, stroke(st.bar, GOAL.BAR_R * 2))
}

function recordBackground(v: View, st: StagePalette, bounds: Bounds): SkPicture {
  return createPicture((canvas) => {
    const groundY = v.oy + FIELD.GROUND_Y * v.scale

    const wall = Skia.Paint()
    wall.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: 0, y: 0 },
        { x: 0, y: groundY },
        [Skia.Color(st.wallTop), Skia.Color(st.wallBottom)],
        null,
        TileMode.Clamp,
      ),
    )
    canvas.drawRect({ x: 0, y: 0, width: v.sw, height: groundY }, wall)

    canvas.save()
    canvas.translate(v.ox, v.oy)
    canvas.scale(v.scale, v.scale)

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

export function createPainter(sw: number, sh: number, insetX: number, st: StagePalette): Painter {
  const view = fitWorld(sw, sh, insetX)
  const controls = layoutControls(view, insetX)
  const bounds = { x: 0, y: 0, width: sw, height: sh }
  const r = controls.r

  const shadow = fill('#000000')
  shadow.setAlphaf(0.35)
  const vinylShine = stroke('#ffffff', 2.5)
  vinylShine.setAlphaf(0.35)

  return {
    view,
    controls,
    bounds,
    background: recordBackground(view, st, bounds),
    blank: createPicture(() => {}, bounds),
    shadow,
    outline: stroke(st.outline, 3),
    thinOutline: stroke(st.outline, 2),
    skin: fill(st.skin),
    white: fill('#ffffff'),
    dark: fill(st.outline),
    band: stroke(st.outline, 7),
    brow: stroke(st.outline, 3.5),
    jersey: [fill(st.players[0]), fill(st.players[1])],
    leg: [stroke(st.players[0], 9), stroke(st.players[1], 9)],
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
  const f = p.facing
  const x = p.x + p.vx * ahead
  const y = Math.min(p.y + p.vy * ahead, FIELD.GROUND_Y)
  const cy = y - PLAYER.HEAD_CY
  const R = PLAYER.HEAD_R

  // Pie de apoyo, detrás del cuerpo.
  drawShoe(canvas, k, x - f * 11, y - 8, f, 0)

  canvas.drawRRect({ rect: { x: x - 15, y: y - 38, width: 30, height: 30 }, rx: 9, ry: 9 }, k.jersey[p.side])
  canvas.drawRRect({ rect: { x: x - 15, y: y - 38, width: 30, height: 30 }, rx: 9, ry: 9 }, k.outline)

  // Pie que chuta: en reposo descansa en el suelo; durante el barrido sigue
  // exactamente el mismo arco que usa la física para golpear.
  if (p.kickT >= 0) {
    const a = kickAngle(p)
    const fx = x + f * Math.sin(a) * KICK.LEG
    const fy = y - KICK.HIP_Y + Math.cos(a) * KICK.LEG
    canvas.drawLine(x + f * 4, y - 26, fx, fy, k.leg[p.side])
    drawShoe(canvas, k, fx, fy, f, (-a * f * 180) / Math.PI)
  } else {
    drawShoe(canvas, k, x + f * 11, y - 8, f, 0)
  }

  canvas.drawCircle(x, cy, R, k.skin)
  canvas.drawCircle(x, cy, R, k.outline)

  // Auriculares: la diadema por encima y el casco en la sien.
  canvas.drawArc({ x: x - R + 2, y: cy - R + 2, width: (R - 2) * 2, height: (R - 2) * 2 }, -160, 140, false, k.band)
  // Bien atrás, lejos del ojo: más centrado, los dos círculos juntos se leían
  // como unas gafas y no como un auricular.
  canvas.drawCircle(x - f * 19, cy + 5, 12, k.jersey[p.side])
  canvas.drawCircle(x - f * 19, cy + 5, 12, k.outline)
  canvas.drawCircle(x - f * 19, cy + 5, 4.5, k.dark)

  // El ojo sigue al vinilo: es poca cosa, pero hace que el muñeco parezca atento.
  const ex = x + f * 17
  const ey = cy - 5
  let lx = ballX - ex
  let ly = ballY - ey
  const len = Math.sqrt(lx * lx + ly * ly) || 1
  lx = (lx / len) * 3.5
  ly = (ly / len) * 3.5
  canvas.drawCircle(ex, ey, 9.5, k.white)
  canvas.drawCircle(ex, ey, 9.5, k.thinOutline)
  canvas.drawCircle(ex + lx, ey + ly, 4.5, k.dark)
  canvas.drawLine(x + f * 7, cy - 21, x + f * 27, cy - 15, k.brow)
  canvas.drawLine(x + f * 14, cy + 17, x + f * 26, cy + 15, k.brow)
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

function drawButton(canvas: SkCanvas, k: Painter, at: Point, icon: SkPath, pressed: boolean): void {
  'worklet'
  canvas.drawCircle(at.x, at.y, k.controls.r, pressed ? k.buttonOn : k.button)
  canvas.drawCircle(at.x, at.y, k.controls.r, k.buttonRing)
  canvas.drawPath(icon, k.icon)
}

export function drawFrame(canvas: SkCanvas, s: GameState, k: Painter, touch: InputFrame, showControls: boolean): void {
  'worklet'
  const v = k.view
  canvas.drawPicture(k.background)

  // La simulación va a pasos fijos y casi nunca coincide con el instante del
  // frame. Se pinta «un poco por delante», lo que quede sin simular: sin esto
  // el movimiento da tironcitos aunque vaya a 60 fps clavados.
  const ahead = s.phase === 'play' || s.phase === 'goal' ? s.acc : 0
  const b = s.ball
  const bx = b.x + b.vx * ahead
  const by = Math.min(b.y + b.vy * ahead, FIELD.GROUND_Y - BALL.R)

  canvas.save()
  canvas.translate(v.ox, v.oy)
  canvas.scale(v.scale, v.scale)

  for (let i = 0; i < 2; i++) {
    const p = s.players[i]
    drawShadow(canvas, k, p.x + p.vx * ahead, p.y, 32)
  }
  drawShadow(canvas, k, bx, by + BALL.R, 20)

  drawPlayer(canvas, k, s.players[1], ahead, bx, by)
  drawPlayer(canvas, k, s.players[0], ahead, bx, by)
  drawVinyl(canvas, k, bx, by, b.angle + b.spin * ahead)

  canvas.restore()

  if (showControls) {
    const c = k.controls
    drawButton(canvas, k, c.left, k.icons.left, touch.move < 0)
    drawButton(canvas, k, c.right, k.icons.right, touch.move > 0)
    drawButton(canvas, k, c.jump, k.icons.jump, touch.jump)
    drawButton(canvas, k, c.kick, k.icons.kick, touch.kick)
  }
}
