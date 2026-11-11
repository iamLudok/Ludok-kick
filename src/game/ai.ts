/**
 * El rival. Es una fuente de inputs como otra cualquiera: mira el partido y
 * devuelve qué botones «pulsa» en este frame. No toca la física ni sabe nada
 * que un jugador no pudiera ver.
 *
 * Para que parezca una persona y no un robot:
 *  - no decide en cada frame, sino cada cierto tiempo (su tiempo de reacción);
 *    entre decisión y decisión sigue con el plan que tenía, aunque el vinilo
 *    haya cambiado de rumbo;
 *  - calcula dónde caerá el vinilo con un error que depende del nivel;
 *  - a veces se queda en blanco, tarda en chutar o se va de cabeza cuando no toca.
 *
 * El azar sale de una semilla guardada en su estado, no de Math.random: así un
 * partido se puede repetir exactamente, que es lo que permite probarla.
 */
import { beatDelta } from './beat'
import { AI, BALL, FIELD, KICK, PLAYER, SIM } from './constants'
import type { GameState, InputFrame, Side } from './types'
import type { Level } from '../types'

export type AiState = {
  level: Level
  seed: number
  /** Tiempo hasta la próxima decisión. */
  thinkT: number
  targetX: number
  /** Tiempo que le queda en blanco. */
  freezeT: number
  /** Cuenta atrás hasta pulsar chutar; negativo si no tiene ningún chut pensado. */
  kickT: number
  /** Si está buscando el beat para chutar: cuánto más está dispuesta a esperar; -1 si no. */
  patience: number
  kickHold: number
  jumpCd: number
  /** En esta jugada va a ir de cabeza. */
  header: boolean
  /** Cuánto lleva el vinilo parado: si es mucho, va a por él como sea. */
  stillT: number
  /** Cuánto lleva guardado el poder que tiene. */
  powerT: number
  /** En esta decisión, ¿espera al momento bueno para el poder? */
  powerSmart: boolean
  out: InputFrame
}

export function createAi(level: Level, seed: number): AiState {
  'worklet'
  return {
    level,
    seed: seed | 0,
    thinkT: 0,
    targetX: -1,
    freezeT: 0,
    kickT: -1,
    patience: -1,
    kickHold: 0,
    jumpCd: 0,
    header: false,
    stillT: 0,
    powerT: 0,
    powerSmart: false,
    out: { move: 0, jump: false, kick: false, power: false },
  }
}

/** Número al azar entre 0 y 1, reproducible (mulberry32). */
function rand(ai: AiState): number {
  'worklet'
  ai.seed = (ai.seed + 0x6d2b79f5) | 0
  let t = Math.imul(ai.seed ^ (ai.seed >>> 15), 1 | ai.seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Error con forma de campana, entre -1 y 1: casi siempre pequeño, a veces grande. */
function wobble(ai: AiState): number {
  'worklet'
  return (rand(ai) + rand(ai) + rand(ai)) / 1.5 - 1
}

/**
 * Dónde estará el vinilo cuando baje a la altura `targetY` (o toque suelo).
 * Es una cuenta aproximada, como la que hace un jugador a ojo: gravedad y
 * rebotes en paredes y techo, sin contar con los jugadores.
 */
function predictX(s: GameState, targetY: number): number {
  'worklet'
  const b = s.ball
  // En Loop el vinilo no se mueve de donde está.
  if (b.loopT > 0) return b.x
  const R = BALL.R
  const dt = 1 / 60
  let x = b.x
  let y = b.y
  let vx = b.vx
  let vy = b.vy
  for (let i = 0; i < 90; i++) {
    vy += BALL.GRAVITY * dt
    x += vx * dt
    y += vy * dt
    if (x < R) {
      x = R
      vx = -vx * BALL.BOUNCE_WALL
    } else if (x > FIELD.W - R) {
      x = FIELD.W - R
      vx = -vx * BALL.BOUNCE_WALL
    }
    if (y < FIELD.CEILING_Y + R) {
      y = FIELD.CEILING_Y + R
      vy = -vy * BALL.BOUNCE_CEILING
    }
    if (y >= FIELD.GROUND_Y - R) return x
    if (vy > 0 && y >= targetY) return x
  }
  return x
}

/**
 * Si pulsara chutar ahora mismo, cuánto tardaría el pie en tocar el vinilo; -1
 * si el barrido no llegaría.
 *
 * Recorre el mismo arco de pierna que usa la física contra la trayectoria del
 * vinilo: según dónde esté, el toque llega a los 10 ms o a los 170, y con una
 * cifra fija la IA llegaba siempre tarde al beat. Solo mira 170 ms hacia
 * delante, que es lo que se puede prever bien: con previsiones más largas el
 * vinilo botaba por medio y la cuenta salía mal.
 */
function contactTime(s: GameState, side: Side): number {
  'worklet'
  const p = s.players[side]
  const b = s.ball
  const f = p.facing
  const rr = KICK.FOOT_R + BALL.R
  for (let t = SIM.DT; t <= KICK.DURATION; t += SIM.DT) {
    const a = KICK.ANGLE_START + (KICK.ANGLE_END - KICK.ANGLE_START) * (t / KICK.DURATION)
    const px = p.x + p.vx * t
    const fx = px + f * Math.sin(a) * KICK.LEG
    const fy = p.y - KICK.HIP_Y + Math.cos(a) * KICK.LEG
    // En Loop el vinilo está quieto en el aire: sin esto la IA lo daba por
    // cayendo y nunca acertaba el momento de chutarlo.
    const loop = b.loopT > t
    const bx = loop ? b.x : b.x + b.vx * t
    const by = loop ? b.y : Math.min(b.y + b.vy * t + 0.5 * BALL.GRAVITY * t * t, FIELD.GROUND_Y - BALL.R)
    // Como en la física, el pie solo golpea lo que tiene delante.
    if ((bx - px) * f <= -6) continue
    const dx = bx - fx
    const dy = by - fy
    if (dx * dx + dy * dy < rr * rr) return t
  }
  return -1
}

function think(ai: AiState, s: GameState, side: Side): void {
  'worklet'
  const L = AI[ai.level]
  const p = s.players[side]
  const b = s.ball
  const f = p.facing
  const ownGoalX = side === 0 ? 0 : FIELD.W
  const home = side === 0 ? AI.HOME_X : FIELD.W - AI.HOME_X

  ai.thinkT = L.think + rand(ai) * L.thinkJitter
  ai.powerSmart = rand(ai) < L.powerIQ
  if (rand(ai) < L.blunder) ai.freezeT = L.freeze * (0.5 + rand(ai))

  // ¿De cabeza o esperándolo abajo? Solo tiene sentido si viene alto.
  const headY = FIELD.GROUND_Y - PLAYER.HEAD_CY - PLAYER.HEAD_R - BALL.R
  const high = b.y < headY - 20
  ai.header = high && rand(ai) < L.headSkill

  const landing = predictX(s, ai.header ? headY : FIELD.GROUND_Y) + wobble(ai) * L.aimError
  // Se coloca «detrás» del vinilo mirando a la portería rival: más separado
  // para chutarlo con el pie, casi debajo para darle con la frente.
  let target = landing - f * (ai.header ? 14 : 42)

  // Si el vinilo anda por el campo contrario, no siempre va a por él: a veces
  // se queda atrás guardando la portería, más cuanto más bajo el nivel. Es una
  // decisión de cada momento y no una distancia fija: con una distancia fija
  // nunca llegaba a un vinilo parado en el campo rival, y se quedaba mirándolo.
  const fromOwnGoal = Math.abs(landing - ownGoalX)
  if (fromOwnGoal > FIELD.W * 0.55 && rand(ai) >= L.pressure) target = home + (target - home) * 0.35

  // El vinilo lleva un rato muerto y no ha sabido llegar por las buenas (suele
  // ser que queda encajado contra el rival, sin sitio para ponerse detrás): va
  // a por él directamente. Sin esto se quedaba mirándolo para siempre.
  if (ai.stillT > AI.STALL) target = b.x

  ai.targetX = Math.max(PLAYER.MIN_X, Math.min(FIELD.W - PLAYER.MIN_X, target))
}

/**
 * ¿Es buen momento para el poder que tiene? Cada poder tiene el suyo, como lo
 * usaría alguien que sabe: el Muro con un tiro yendo a su portería, el Loop con el
 * vinilo delante, el Low-pass en plena disputa. Los niveles bajos a menudo no
 * esperan al momento y lo sueltan cuando sea.
 */
function wantsPower(ai: AiState, s: GameState, side: Side): boolean {
  'worklet'
  const p = s.players[side]
  const opp = s.players[side === 0 ? 1 : 0]
  const b = s.ball
  const f = p.facing
  const kind = p.power
  // Sin paciencia para esperar el momento: lo suelta en cuanto lo tiene un rato.
  if (!ai.powerSmart) return ai.powerT > 1.5
  const ownGoalX = side === 0 ? 0 : FIELD.W
  const ahead = (b.x - p.x) * f
  const towardOwnGoal = b.vx * -f
  const nearMe = Math.abs(p.x - b.x) < 260
  const nearRival = Math.abs(opp.x - b.x) < 220
  // Un tiro que va hacia su portería y al que él no llega.
  const danger = towardOwnGoal > 300 && Math.abs(b.x - ownGoalX) < 380 && Math.abs(p.x - ownGoalX) > Math.abs(b.x - ownGoalX)

  // Las que se preparan para el siguiente tiro: cuanto antes, mejor.
  if (kind === 'scratch' || kind === 'laser') return true
  // Las que fastidian al rival: justo cuando está a punto de tocarlo.
  if (kind === 'lowpass' || kind === 'robot' || kind === 'jester') return nearRival && Math.abs(p.x - b.x) < 420
  // El Apagón, sobre todo si el rival tiene algo cargado.
  if (kind === 'blackout') return opp.power !== null || opp.energy >= 0.5 || (nearRival && danger)
  // El Bombo, con el rival (o el vinilo) a tiro de la onda.
  if (kind === 'stomp') return Math.abs(opp.x - p.x) < 220 || (danger && Math.abs(b.x - p.x) < 250)
  // Las de defensa: con un tiro yendo a su portería.
  if (kind === 'wall') return danger
  if (kind === 'loop') return danger || (ahead > 30 && ahead < 140 && b.y > FIELD.GROUND_Y - 140 && Math.abs(b.vx) < 500)
  // Las que ayudan a llegar arriba: con el vinilo alto cerca.
  if (kind === 'hype' || kind === 'wings' || kind === 'bighead') return nearMe && b.y < FIELD.GROUND_Y - 160
  // La Nube y la Luna: con el vinilo en el aire por su lado del campo.
  return nearMe && b.y < FIELD.GROUND_Y - 120
}

/**
 * Lo que pulsa el rival en este frame. Hay que llamarla una vez por frame,
 * antes de `stepGame`, y pasarle el resultado como input de ese lado.
 */
export function stepAi(ai: AiState, s: GameState, side: Side, frameDt: number): InputFrame {
  'worklet'
  const dt = frameDt
  const L = AI[ai.level]
  const out = ai.out
  out.move = 0
  out.jump = false
  out.kick = false
  out.power = false
  if (s.phase !== 'play') {
    // Tras cada gol empieza de cero: lo que pensaba ya no vale.
    ai.thinkT = 0
    ai.stillT = 0
    ai.kickT = -1
    ai.patience = -1
    ai.kickHold = 0
    return out
  }

  const p = s.players[side]
  const b = s.ball
  const f = p.facing

  ai.thinkT -= dt
  if (ai.jumpCd > 0) ai.jumpCd -= dt
  ai.stillT = Math.abs(b.vx) + Math.abs(b.vy) < 60 ? ai.stillT + dt : 0
  if (ai.thinkT <= 0 || ai.targetX < 0) think(ai, s, side)

  // La paciencia con el poder corre siempre, también en los despistes: si no,
  // un nivel despistado se lo guardaba mucho más de lo que dice su ficha.
  ai.powerT = p.power === null ? 0 : ai.powerT + dt

  if (ai.freezeT > 0) {
    ai.freezeT -= dt
    return out
  }

  const diff = ai.targetX - p.x
  if (Math.abs(diff) > 7) out.move = Math.sign(diff) * L.speed

  // Posición del vinilo respecto al jugador: `ahead` es cuánto lo tiene por
  // delante y `up` a qué altura sobre sus pies.
  const ahead = (b.x - p.x) * f
  const up = p.y - b.y
  // Hacia dónde queda su propia portería: el contrario de hacia donde mira.
  const towardOwnGoal = b.vx * -f

  /* --- Saltar ------------------------------------------------------------ */
  if (p.grounded && ai.jumpCd <= 0) {
    const gap = p.y - PLAYER.HEAD_CY - PLAYER.HEAD_R - (b.y + BALL.R)
    const overhead = Math.abs(b.x - p.x) < 48 && gap > 10 && gap < 95 && b.vy > -150
    // Con el vinilo a la espalda y a ras de suelo, correr hacia atrás lo
    // empujaría a su propia portería: lo salta para ponerse detrás.
    // Igual si el vinilo ya va camino de su portería: correr por debajo de él
    // era la forma más rápida de meterse un gol en propia.
    const hopOver = ahead < -4 && ahead > -90 && up < 70 && (Math.abs(diff) > 20 || towardOwnGoal > 150)
    // El rival le corta el paso hacia donde quiere ir: lo salta, como en el
    // género. Sin esto se quedaba empujándolo sin fin.
    const opp = s.players[side === 0 ? 1 : 0]
    const gapToOpp = opp.x - p.x
    // Solo si al otro lado hay sitio para colocarse: si el hueco entre el
    // rival y donde quiere ir es más estrecho que él, aterrizaba con el vinilo
    // a la espalda y acababa empujándolo hacia su propia portería.
    const room = Math.abs(ai.targetX - opp.x) >= PLAYER.HEAD_R * 2 + 6 || ai.stillT > AI.STALL
    const blocked =
      room &&
      Math.abs(gapToOpp) < PLAYER.HEAD_R * 2 + 12 &&
      Math.sign(gapToOpp) === Math.sign(diff) &&
      Math.abs(diff) > Math.abs(gapToOpp)
    if ((overhead && ai.header) || hopOver || blocked) {
      out.jump = true
      ai.jumpCd = 0.25 + rand(ai) * 0.35
    }
  }

  /* --- Poder ------------------------------------------------------------ */
  if (p.power !== null && (wantsPower(ai, s, side) || ai.powerT > L.powerPatience)) out.power = true

  /* --- Chutar ------------------------------------------------------------ */
  // Con el vinilo a tiro hay dos maneras de chutar, según el nivel: a lo
  // bruto, en cuanto llega (con un poco de retraso al azar), o buscando el
  // beat. Buscando el beat no se para: sigue jugando y, en cada frame, mira si
  // pulsando YA el pie tocaría el vinilo en el beat. Si es que sí, chuta; si se
  // le acaba la paciencia, chuta igual.
  const busy = p.kickT >= 0 || p.kickCd > 0 || ai.kickHold > 0
  const c = busy ? -1 : contactTime(s, side)
  if (c < 0) {
    ai.kickT = -1
    ai.patience = -1
  } else {
    if (ai.kickT < 0 && ai.patience < 0) {
      if (s.beat.on && rand(ai) < L.beatSkill) ai.patience = AI.MAX_BEAT_WAIT
      else ai.kickT = rand(ai) * L.kickSlop
    }
    if (ai.patience >= 0) {
      const bt = s.beat
      // El pie empieza a moverse en el primer paso del frame siguiente.
      const contactAt = bt.now + SIM.DT + c
      ai.patience -= dt
      // Con un DJ de ventana más amplia (Minimal) se conforma con menos, como
      // haría una persona que sabe que tiene margen.
      if (Math.abs(beatDelta(contactAt, bt.t0, bt.bpm)) <= AI.BEAT_AIM * p.stats.timing || ai.patience < 0) {
        ai.patience = -1
        ai.kickHold = 0.08
      }
    } else {
      ai.kickT -= dt
      if (ai.kickT <= 0) {
        ai.kickT = -1
        ai.kickHold = 0.08
      }
    }
  }
  if (ai.kickHold > 0) {
    ai.kickHold -= dt
    out.kick = true
  }

  return out
}
