/**
 * El núcleo del juego: una función que avanza el estado. No importa React,
 * Skia ni nada nativo, y eso es deliberado:
 *
 *  - corre en el hilo de UI del móvil (por eso cada función lleva 'worklet'),
 *  - y corre tal cual en Node, que es como lo prueba `verify/physics.ts`.
 *
 * El estado se muta en el sitio en vez de devolver uno nuevo: a 120 pasos por
 * segundo, crear objetos en cada paso acaba en pausas del recolector de basura,
 * que en un juego se notan como tirones.
 */
import { beatDelta, judgeDelta, judgePower } from './beat'
import { BALL, BODY, FIELD, GOAL, HEADER, KICK, MATCH, PLAYER, POWER, SHOCK, SIM } from './constants'
import { nextRandom } from './rng'
import { emptyInput, resetForKickoff, startX } from './state'
import { POWER_KINDS, type Contact, type GameState, type InputFrame, type Judge, type PlayerState, type Side } from './types'

function clamp(v: number, lo: number, hi: number): number {
  'worklet'
  return v < lo ? lo : v > hi ? hi : v
}

function lerp(a: number, b: number, t: number): number {
  'worklet'
  return a + (b - a) * t
}

function approach(v: number, target: number, maxDelta: number): number {
  'worklet'
  if (v < target) return Math.min(v + maxDelta, target)
  return Math.max(v - maxDelta, target)
}

/* --- Geometría ----------------------------------------------------------- */

/** Círculo contra segmento con grosor. Si se tocan, deja en `out` hacia dónde sacar el círculo. */
function circleVsSegment(
  cx: number,
  cy: number,
  r: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  segR: number,
  out: Contact,
): boolean {
  'worklet'
  const abx = bx - ax
  const aby = by - ay
  const t = clamp(((cx - ax) * abx + (cy - ay) * aby) / (abx * abx + aby * aby), 0, 1)
  let dx = cx - (ax + abx * t)
  let dy = cy - (ay + aby * t)
  const d2 = dx * dx + dy * dy
  const rr = r + segR
  if (d2 >= rr * rr) return false
  const d = Math.sqrt(d2)
  if (d < 1e-6) {
    dx = 0
    dy = -1
  } else {
    dx /= d
    dy /= d
  }
  out.nx = dx
  out.ny = dy
  out.pen = rr - d
  return true
}

/** El techo inclinado de la portería de ese lado, que hace también de larguero. */
function circleVsRoof(side: Side, cx: number, cy: number, r: number, out: Contact): boolean {
  'worklet'
  const barY = FIELD.GROUND_Y - GOAL.HEIGHT
  const wallX = side === 0 ? 0 : FIELD.W
  const lineX = side === 0 ? GOAL.DEPTH : FIELD.W - GOAL.DEPTH
  return circleVsSegment(cx, cy, r, wallX, barY - GOAL.ROOF_RISE, lineX, barY, GOAL.BAR_R, out)
}

/** Altura del techo de la portería a `dist` unidades de su pared. */
function roofYAt(dist: number): number {
  'worklet'
  const barY = FIELD.GROUND_Y - GOAL.HEIGHT
  return barY - GOAL.ROOF_RISE * (1 - clamp(dist / GOAL.DEPTH, 0, 1))
}

/* --- Jugadores ----------------------------------------------------------- */

/** Ángulo de la pierna que chuta: 0 en reposo. Lo usan la física y el dibujo. */
export function kickAngle(p: PlayerState): number {
  'worklet'
  if (p.kickT < 0) return 0
  return lerp(KICK.ANGLE_START, KICK.ANGLE_END, clamp(p.kickT / KICK.DURATION, 0, 1))
}

function clampPlayerX(p: PlayerState): boolean {
  'worklet'
  const min = PLAYER.MIN_X
  const max = FIELD.W - PLAYER.MIN_X
  if (p.x < min) {
    p.x = min
    if (p.vx < 0) p.vx = 0
    return true
  }
  if (p.x > max) {
    p.x = max
    if (p.vx > 0) p.vx = 0
    return true
  }
  return false
}

function updatePlayer(s: GameState, p: PlayerState, inp: InputFrame, dt: number): void {
  'worklet'
  const target = clamp(inp.move, -1, 1) * PLAYER.SPEED * p.stats.speed
  p.vx = approach(p.vx, target, (p.grounded ? PLAYER.ACCEL : PLAYER.AIR_ACCEL) * dt)

  // Con el botón mantenido vuelve a saltar nada más aterrizar: así no hay que
  // acertar el instante exacto del toque para encadenar saltos.
  if (inp.jump && p.grounded) {
    p.vy = -PLAYER.JUMP_V * p.stats.jump
    p.grounded = false
  }

  p.vy += PLAYER.GRAVITY * dt
  p.x += p.vx * dt
  p.y += p.vy * dt

  // La cabeza choca con el techo de las porterías; sin esto, al saltar dentro
  // de la portería la cabeza atravesaba el larguero.
  if (!p.grounded) {
    const c = s.contact
    for (let side = 0; side < 2; side++) {
      if (circleVsRoof(side as Side, p.x, p.y - PLAYER.HEAD_CY, PLAYER.HEAD_R, c)) {
        p.x += c.nx * c.pen
        p.y += c.ny * c.pen
        if (c.ny > 0.3 && p.vy < 0) p.vy = 0
      }
    }
  }

  if (p.y >= FIELD.GROUND_Y) {
    p.y = FIELD.GROUND_Y
    p.vy = 0
    p.grounded = true
  }
  clampPlayerX(p)

  if (p.touchCd > 0) p.touchCd -= dt
  if (p.kickT >= 0) {
    p.kickT += dt
    if (p.kickT >= KICK.DURATION) {
      p.kickT = -1
      p.kickCd = KICK.COOLDOWN
    }
  } else {
    if (p.kickCd > 0) p.kickCd -= dt
    if (inp.kick && p.kickCd <= 0) {
      p.kickT = 0
      p.kickHit = false
    }
  }
}

/**
 * Los jugadores no se atraviesan, pero solo se empujan en horizontal: así uno
 * puede saltar por encima del otro y, si le cae encima, resbala hacia un lado
 * en vez de quedarse de pie sobre su cabeza.
 */
function separatePlayers(a: PlayerState, b: PlayerState): void {
  'worklet'
  const rr = PLAYER.HEAD_R * 2
  const dy = a.y - b.y
  if (Math.abs(dy) >= rr * 0.92) return
  const need = Math.sqrt(rr * rr - dy * dy)
  const dx = b.x - a.x
  const overlap = need - Math.abs(dx)
  if (overlap <= 0) return
  const dir = dx !== 0 ? Math.sign(dx) : a.side === 0 ? 1 : -1
  a.x -= dir * overlap * 0.5
  b.x += dir * overlap * 0.5
  // Si la pared frena a uno, el otro cede todo lo que falta.
  const aClamped = clampPlayerX(a)
  const bClamped = clampPlayerX(b)
  if (aClamped) b.x = a.x + dir * need
  if (bClamped) a.x = b.x - dir * need
}

/* --- Vinilo -------------------------------------------------------------- */

/** Rebote contra algo inmóvil con la normal que hay en `s.contact`. */
function bounceBall(s: GameState, restitution: number): void {
  'worklet'
  const b = s.ball
  const c = s.contact
  b.x += c.nx * c.pen
  b.y += c.ny * c.pen
  const vn = b.vx * c.nx + b.vy * c.ny
  if (vn >= 0) return
  // Un impacto flojo no rebota: si no, el vinilo apoyado vibra para siempre.
  const e = -vn < BALL.REST_SPEED ? 0 : restitution
  b.vx -= (1 + e) * vn * c.nx
  b.vy -= (1 + e) * vn * c.ny
  if (e > 0) s.events.push({ type: 'bounce', speed: -vn })
}

function ballVsWorld(s: GameState): void {
  'worklet'
  const b = s.ball
  const R = BALL.R

  // El techo de las porterías va primero y los límites del campo después: así,
  // en la esquina donde se juntan, manda la pared. Al revés, el techo sacaba
  // el vinilo del campo a través de ella.
  for (let side = 0; side < 2; side++) {
    if (circleVsRoof(side as Side, b.x, b.y, R, s.contact)) bounceBall(s, GOAL.BOUNCE)
  }

  if (b.y + R > FIELD.GROUND_Y) {
    b.y = FIELD.GROUND_Y - R
    if (b.vy > 0) {
      if (b.vy < BALL.REST_SPEED) {
        b.vy = 0
      } else {
        s.events.push({ type: 'bounce', speed: b.vy })
        // El efecto se acaba al tocar el suelo: girando también después del
        // bote, el vinilo se enroscaba por el suelo de forma muy rara.
        b.curveT = 0
        b.vy = -b.vy * BALL.BOUNCE_GROUND
        b.vx *= BALL.GROUND_GRIP
      }
    }
    b.spin = b.vx / R
  }
  if (b.y - R < FIELD.CEILING_Y) {
    b.y = FIELD.CEILING_Y + R
    if (b.vy < 0) b.vy = -b.vy * BALL.BOUNCE_CEILING
  }
  if (b.x - R < 0) {
    b.x = R
    if (b.vx < 0) b.vx = -b.vx * BALL.BOUNCE_WALL
  }
  if (b.x + R > FIELD.W) {
    b.x = FIELD.W - R
    if (b.vx > 0) b.vx = -b.vx * BALL.BOUNCE_WALL
  }
}

/**
 * Choque del vinilo con un círculo del jugador (cabeza o cuerpo). El jugador
 * no se inmuta: es como si pesara infinito. Devuelve true si fue un golpe de
 * verdad y no un simple apoyo.
 */
function ballVsCircle(
  s: GameState,
  cx: number,
  cy: number,
  r: number,
  pvx: number,
  pvy: number,
  restitution: number,
  boost: number,
): boolean {
  'worklet'
  const b = s.ball
  let dx = b.x - cx
  let dy = b.y - cy
  const rr = r + BALL.R
  const d2 = dx * dx + dy * dy
  if (d2 >= rr * rr) return false
  const d = Math.sqrt(d2)
  if (d < 1e-6) {
    dx = 0
    dy = -1
  } else {
    dx /= d
    dy /= d
  }
  b.x += dx * (rr - d)
  b.y += dy * (rr - d)
  const rel = (b.vx - pvx * PLAYER.PUSH) * dx + (b.vy - pvy * PLAYER.PUSH) * dy
  if (rel >= 0) return false
  const hard = -rel > HEADER.MIN_IMPACT
  const j = -(1 + (hard ? restitution : 0)) * rel + (hard ? boost : 0)
  b.vx += j * dx
  b.vy += j * dy
  b.spin = b.vx / BALL.R
  return hard
}

/* --- Poderes ------------------------------------------------------------- */

/** Fracción de su velocidad a la que va un jugador: menos de 1 bajo un Low-pass. */
function pace(p: PlayerState): number {
  'worklet'
  return p.slowT > 0 ? POWER.SLOW_FACTOR : 1
}

/**
 * Lo que pasa cada vez que un jugador toca el vinilo de verdad (pie o
 * cabeza): rompe un Loop, suelta su Scratch si lo tenía preparado y, si fue
 * PERFECT, carga energía.
 */
function onTouch(s: GameState, p: PlayerState, judge: Judge): void {
  'worklet'
  const b = s.ball
  b.loopT = 0
  if (p.scratch) {
    p.scratch = false
    b.curveT = POWER.CURVE_TIME
    b.curveDir = p.facing
  }
  if (judge === 2 && p.power === null) {
    p.energy = Math.min(1, p.energy + POWER.PER_PERFECT)
    if (p.energy >= 1) {
      // El poder propio del DJ, o uno al azar si no tiene (o si se juega así).
      const own = POWER.SIGNATURE ? p.stats.power : null
      p.power = own !== null ? own : POWER_KINDS[Math.floor(nextRandom(s) * POWER_KINDS.length)]
      s.events.push({ type: 'charged', side: p.side, kind: p.power })
    }
  }
}

function usePower(s: GameState, p: PlayerState): void {
  'worklet'
  const kind = p.power
  if (kind === null) return
  const fromX = p.x
  const fromY = p.y - PLAYER.HEAD_CY
  p.power = null
  p.energy = 0
  if (kind === 'scratch') {
    p.scratch = true
  } else if (kind === 'lowpass') {
    s.players[p.side === 0 ? 1 : 0].slowT = POWER.LOWPASS_TIME
  } else if (kind === 'loop') {
    const b = s.ball
    b.loopT = POWER.LOOP_TIME
    b.curveT = 0
  } else {
    // Cue: de vuelta al punto de partida, quieto y con el pie recogido.
    p.x = startX(p.side)
    p.y = FIELD.GROUND_Y
    p.vx = 0
    p.vy = 0
    p.grounded = true
    p.kickT = -1
    p.recoverT = POWER.CUE_RECOVER
  }
  s.events.push({ type: 'power', side: p.side, kind, x: fromX, y: fromY })
}

/** Cómo de a tiempo cae un toque que ocurre en este mismo paso. */
function judgeTouch(s: GameState, p: PlayerState): Judge {
  'worklet'
  const bt = s.beat
  if (!bt.on) return 0
  return judgeDelta(beatDelta(bt.now, bt.t0, bt.bpm), bt.bpm, p.stats.timing)
}

function ballVsPlayer(s: GameState, p: PlayerState): void {
  'worklet'
  const b = s.ball
  // Bajo un Low-pass el jugador se mueve más despacio, y así empuja el vinilo.
  const pvx = p.vx * pace(p)
  const pvy = p.vy * pace(p)

  // El pie solo existe mientras dura el barrido, y solo golpea lo que tiene
  // delante: un vinilo a la espalda salía disparado a través del propio cuerpo.
  if (p.kickT >= 0 && !p.kickHit && (b.x - p.x) * p.facing > -6) {
    const a = kickAngle(p)
    const fx = p.x + p.facing * Math.sin(a) * KICK.LEG
    const fy = p.y - KICK.HIP_Y + Math.cos(a) * KICK.LEG
    const dx = b.x - fx
    const dy = b.y - fy
    const rr = KICK.FOOT_R + BALL.R
    if (dx * dx + dy * dy < rr * rr) {
      const t = clamp(p.kickT / KICK.DURATION, 0, 1)
      const judge = judgeTouch(s, p)
      const power = p.stats.kick * judgePower(judge)
      b.vx = p.facing * KICK.VX * lerp(KICK.FLAT_VX, KICK.LOB_VX, t) * power + pvx * KICK.INHERIT
      b.vy = -KICK.VY * lerp(KICK.FLAT_LIFT, KICK.LOB_LIFT, t) * power
      b.spin = b.vx / BALL.R
      p.kickHit = true
      // Un chut cuenta también como toque: sin esto, el vinilo recién chutado
      // rozaba la cabeza en el paso siguiente y se juzgaba dos veces.
      p.touchCd = 0.15
      s.events.push({ type: 'kick', side: p.side, judge, x: b.x, y: b.y })
      onTouch(s, p, judge)
    }
  }

  const headed = ballVsCircle(
    s,
    p.x,
    p.y - PLAYER.HEAD_CY,
    PLAYER.HEAD_R,
    pvx,
    pvy,
    HEADER.RESTITUTION,
    HEADER.BOOST,
  )
  if (headed && p.touchCd <= 0) {
    p.touchCd = 0.15
    const judge = judgeTouch(s, p)
    const power = judgePower(judge)
    b.vx *= power
    b.vy *= power
    s.events.push({ type: 'head', side: p.side, judge, x: b.x, y: b.y })
    onTouch(s, p, judge)
  }
  ballVsCircle(s, p.x, p.y - PLAYER.BODY_R, PLAYER.BODY_R, pvx, pvy, BODY.RESTITUTION, 0)
}

/** Cuánto se mete el vinilo en la cabeza o el cuerpo del jugador ahora mismo. */
function overlapWithPlayer(s: GameState, p: PlayerState): number {
  'worklet'
  const b = s.ball
  const hx = b.x - p.x
  const hy = b.y - (p.y - PLAYER.HEAD_CY)
  const head = PLAYER.HEAD_R + BALL.R - Math.sqrt(hx * hx + hy * hy)
  const by = b.y - (p.y - PLAYER.BODY_R)
  const body = PLAYER.BODY_R + BALL.R - Math.sqrt(hx * hx + by * by)
  return Math.max(head, body)
}

/**
 * Si después de resolver choques el vinilo sigue metido en un jugador, es que
 * está atrapado contra algo y los empujones se anulan entre sí. Sin esta
 * salida se quedaba clavado temblando. Hay tres casos:
 *
 *  - entre los dos jugadores: salta hacia arriba, como en el género;
 *  - pisado contra el suelo: sale escupido hacia un lado;
 *  - contra una pared o el techo de la portería: ahí el vinilo no tiene a
 *    dónde ir, así que es el jugador el que cede y retrocede.
 */
function unstickBall(s: GameState): void {
  'worklet'
  const b = s.ball
  const [p0, p1] = s.players
  const o0 = overlapWithPlayer(s, p0)
  const o1 = overlapWithPlayer(s, p1)
  const slack = 0.5
  if (o0 <= slack && o1 <= slack) return

  if (o0 > slack && o1 > slack) {
    b.y = Math.max(b.y - 14, FIELD.CEILING_Y + BALL.R)
    if (b.vy > -420) b.vy = -420
    return
  }

  const p = o0 > o1 ? p0 : p1
  const overlap = Math.max(o0, o1)
  const onGround = b.y + BALL.R >= FIELD.GROUND_Y - 0.5
  const under = b.y > p.y - PLAYER.HEAD_CY + PLAYER.HEAD_R * 0.5
  if (onGround && under) {
    const x = b.x + (b.x >= p.x ? 1 : -1) * overlap
    if (x >= BALL.R && x <= FIELD.W - BALL.R) {
      b.x = x
      return
    }
  }
  const away = p.x !== b.x ? Math.sign(p.x - b.x) : p.x < FIELD.W / 2 ? 1 : -1
  p.x += away * overlap
  clampPlayerX(p)
}

function updateBall(s: GameState, dt: number, realDt: number): void {
  'worklet'
  const b = s.ball
  const R = BALL.R

  if (b.loopT > 0) {
    // Loop: el vinilo se queda en el aire, sin gravedad. Si estaba bajo, sube
    // con suavidad a una altura que se pueda rematar.
    b.loopT -= realDt
    const hover = Math.min(b.y, FIELD.GROUND_Y - POWER.LOOP_HEIGHT)
    b.vx = 0
    b.vy = (hover - b.y) * 6
    b.y += b.vy * dt
    b.angle += b.spin * dt
    for (let i = 0; i < 2; i++) {
      ballVsPlayer(s, s.players[0])
      ballVsPlayer(s, s.players[1])
      ballVsWorld(s)
    }
    // Un toque de verdad ya rompió el loop dentro de `ballVsPlayer`; un simple
    // empujón, no: el vinilo vuelve a quedarse quieto donde lo dejen.
    if (b.loopT > 0) {
      b.vx = 0
      b.vy = 0
    }
    return
  }

  if (b.curveT > 0) {
    // Scratch: la trayectoria gira hacia el suelo del lado al que va el tiro,
    // como un efecto muy cerrado. Gira la velocidad sin cambiar su tamaño.
    b.curveT -= dt
    const a = b.curveDir * POWER.CURVE_RATE * dt
    const c = Math.cos(a)
    const sn = Math.sin(a)
    const vx = b.vx * c - b.vy * sn
    b.vy = b.vx * sn + b.vy * c
    b.vx = vx
  }

  b.vy += BALL.GRAVITY * dt
  const drag = 1 - BALL.AIR_DRAG * dt
  b.vx *= drag
  b.vy *= drag
  // Apoyado en el suelo, rueda y se va frenando.
  if (b.y + R >= FIELD.GROUND_Y - 0.5 && Math.abs(b.vy) < BALL.REST_SPEED) {
    b.vx *= 1 - BALL.ROLL_FRICTION * dt
  }
  // La red frena el vinilo tras el gol para que no salga rebotado de la portería.
  if (s.phase === 'drop' && (b.x < GOAL.DEPTH || b.x > FIELD.W - GOAL.DEPTH)) {
    b.vx *= 1 - 5 * dt
  }

  b.x += b.vx * dt
  b.y += b.vy * dt
  b.angle += b.spin * dt

  // Dos pasadas: la segunda corrige lo que la primera deshace (un jugador
  // empuja el vinilo contra el suelo y el suelo lo devuelve contra el jugador).
  for (let i = 0; i < 2; i++) {
    ballVsPlayer(s, s.players[0])
    ballVsPlayer(s, s.players[1])
    ballVsWorld(s)
  }
  unstickBall(s)

  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
  if (speed > BALL.MAX_SPEED) {
    b.vx *= BALL.MAX_SPEED / speed
    b.vy *= BALL.MAX_SPEED / speed
  }
}

/* --- Partido ------------------------------------------------------------- */

function checkGoal(s: GameState): void {
  'worklet'
  const b = s.ball
  const line = GOAL.DEPTH - GOAL.LINE_MARGIN
  let scorer: Side | -1 = -1
  // «Por debajo del techo» basta para saber que entró por la boca: el techo es
  // sólido, así que por arriba no puede haber llegado ahí.
  if (b.x < line && b.y > roofYAt(b.x)) scorer = 1
  else if (b.x > FIELD.W - line && b.y > roofYAt(FIELD.W - b.x)) scorer = 0
  if (scorer === -1) return
  s.score[scorer] += 1
  s.scorer = scorer
  s.phase = 'goal'
  s.phaseT = 0
  s.events.push({ type: 'goal', side: scorer, at: s.beat.on ? s.beat.now : -1 })
}

/** ¿Toca ya el drop? `waited` es lo que lleva congelado, en segundos de verdad. */
function dropDue(s: GameState, waited: number): boolean {
  'worklet'
  if (waited >= MATCH.MAX_FREEZE) return true
  const bt = s.beat
  // Sin música, una pausa fija. Con música, el instante que diga ella, que es
  // un beat; mientras no lo ha dicho (tarda unos milisegundos), se espera.
  if (!bt.on) return waited >= MATCH.GOAL_FREEZE
  return bt.dropAt >= 0 && bt.now >= bt.dropAt
}

/**
 * Cae el drop: la onda expansiva sale de quien marcó y lanza por los aires al
 * que encajó. Es sobre todo espectáculo: después se saca igual.
 */
function drop(s: GameState): void {
  'worklet'
  const scorer = s.players[s.scorer]
  const rival = s.players[s.scorer === 0 ? 1 : 0]
  const away = rival.x !== scorer.x ? Math.sign(rival.x - scorer.x) : rival.facing * -1
  rival.vx = away * SHOCK.PUSH_X
  rival.vy = -SHOCK.PUSH_Y
  rival.grounded = false
  s.phase = 'drop'
  s.phaseT = MATCH.DROP_AFTER
  s.events.push({ type: 'drop', side: s.scorer, x: scorer.x, y: scorer.y - PLAYER.HEAD_CY })
}

const IDLE = emptyInput()

/**
 * Un paso de simulación. `dt` es tiempo de juego y `realDt` lo que dura ese
 * paso en el mundo. Hoy son iguales (el juego va siempre a la misma
 * velocidad), pero los relojes (el del partido, las pausas, los poderes) van
 * con `realDt` a propósito: son segundos de verdad pase lo que pase con la
 * simulación.
 */
function tick(s: GameState, in0: InputFrame, in1: InputFrame, dt: number, realDt: number): void {
  'worklet'
  s.tick += 1
  if (s.phase === 'ended') return
  if (s.phase === 'kickoff') {
    s.phaseT -= realDt
    if (s.phaseT <= 0) s.phase = 'play'
    return
  }
  if (s.phase === 'goal') {
    // Congelado de verdad: ni el vinilo se mueve. Solo cuenta lo que se espera.
    s.phaseT += realDt
    if (dropDue(s, s.phaseT)) drop(s)
    return
  }

  // Tras el drop nadie manda: los jugadores van a donde los lleve la onda.
  const live = s.phase === 'play'
  for (let i = 0; i < 2; i++) {
    const p = s.players[i]
    // Recién llegado de un Cue no responde a los botones durante un instante.
    if (p.recoverT > 0) p.recoverT -= realDt
    const inp = live && p.recoverT <= 0 ? (i === 0 ? in0 : in1) : IDLE
    // El poder se lanza al pulsar, no mientras se mantiene el botón.
    if (inp.power && !p.powerHeld) usePower(s, p)
    p.powerHeld = inp.power
    // Bajo un Low-pass, todo lo suyo va a cámara lenta: correr, saltar, chutar.
    updatePlayer(s, p, inp, dt * pace(p))
    if (p.slowT > 0) p.slowT -= realDt
  }
  separatePlayers(s.players[0], s.players[1])
  updateBall(s, dt, realDt)

  if (live) {
    checkGoal(s)
    if (s.phase === 'play' && !s.golden) {
      s.timeLeft -= realDt
      if (s.timeLeft <= 0) {
        s.timeLeft = 0
        if (s.score[0] === s.score[1]) s.golden = true
        else s.phase = 'ended'
      }
    }
    return
  }

  // Fase 'drop': se deja correr la física un momento y luego se saca, salvo
  // que ese gol decidiera el partido.
  s.phaseT -= realDt
  if (s.phaseT > 0) return
  const decided = s.score[0] !== s.score[1] && (s.golden || s.timeLeft <= 0)
  if (decided) s.phase = 'ended'
  else resetForKickoff(s)
}

/** El pulso de la música en el instante en que acaba este frame. */
export type BeatInput = {
  /** Lo que el jugador está oyendo ahora, en segundos del reloj de audio. */
  time: number
  /** El compás que suena: cuándo empezó y a qué tempo va. */
  t0: number
  bpm: number
  /** Cuándo cae el drop del gol en curso; -1 si la música aún no lo ha dicho. */
  dropAt: number
}

/**
 * Avanza el partido `frameDt` segundos de reloj, en pasos fijos de SIM.DT. Lo
 * que sobra se guarda en `s.acc` para el frame siguiente.
 *
 * `beat` es opcional: sin él se juega igual, solo que ningún toque cuenta como
 * dado a tiempo. El tempo no cambia la velocidad del juego: un DJ de techno
 * suena más rápido que uno de house, pero los muñecos corren igual.
 */
export function stepGame(s: GameState, in0: InputFrame, in1: InputFrame, frameDt: number, beat?: BeatInput): void {
  'worklet'
  s.events.length = 0
  const bt = s.beat
  bt.on = beat !== undefined
  if (beat) {
    bt.t0 = beat.t0
    bt.bpm = beat.bpm
    bt.dropAt = beat.dropAt
  }
  s.acc += Math.min(frameDt, SIM.MAX_STEPS * SIM.DT)
  while (s.acc >= SIM.DT) {
    // Cada paso ocurre un poco antes del final del frame: lo que quede por
    // simular después de él. Así un toque se juzga en su instante y no en el
    // del frame, que a 60 Hz podía caer hasta 16 ms más tarde.
    if (beat) bt.now = beat.time - (s.acc - SIM.DT)
    tick(s, in0, in1, SIM.DT, SIM.DT)
    s.acc -= SIM.DT
  }
}
