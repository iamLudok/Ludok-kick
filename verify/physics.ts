/**
 * Prueba el núcleo del juego ejecutando el MISMO código que corre en el móvil.
 * Aquí no se comprueba si es divertido (eso solo se ve jugando), sino lo que
 * tiene que cumplirse siempre: que el vinilo no se escapa del campo, que los
 * goles se cuentan, que el reloj acaba el partido y que la simulación da el
 * mismo resultado se pinte a 60 o a 144 Hz.
 */
import { BALL, FIELD, GOAL, MATCH, PLAYER, SIM } from '../src/game/constants'
import { createInitialState, emptyInput } from '../src/game/state'
import { stepGame } from '../src/game/step'
import type { GameState, InputFrame } from '../src/game/types'

let failures = 0

function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

const IDLE = emptyInput()

function input(partial: Partial<InputFrame>): InputFrame {
  return { ...emptyInput(), ...partial }
}

/** Avanza `seconds` de partido a 60 fps con inputs fijos. */
function run(s: GameState, seconds: number, in0: InputFrame = IDLE, in1: InputFrame = IDLE): void {
  const frames = Math.round(seconds * 60)
  for (let i = 0; i < frames; i++) stepGame(s, in0, in1, 1 / 60)
}

/** Estado ya en juego, sin la congelación del saque. */
function playing(): GameState {
  const s = createInitialState()
  run(s, MATCH.KICKOFF_DELAY + 0.05)
  return s
}

/** Generador con semilla: los fallos de la prueba aleatoria tienen que poder repetirse. */
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInput(r: () => number): InputFrame {
  return { move: Math.floor(r() * 3) - 1, jump: r() < 0.4, kick: r() < 0.5, power: false, dash: 0 }
}

/* --- Saque y reposo ------------------------------------------------------ */
{
  const s = createInitialState()
  check('empieza en saque', s.phase === 'kickoff')
  const y0 = s.ball.y
  run(s, MATCH.KICKOFF_DELAY * 0.5)
  check('durante el saque el vinilo no cae', s.ball.y === y0)
  run(s, MATCH.KICKOFF_DELAY)
  check('tras el saque se juega', s.phase === 'play')
  run(s, 8)
  const restY = FIELD.GROUND_Y - BALL.R
  check('el vinilo acaba parado en el suelo', Math.abs(s.ball.y - restY) < 0.01 && s.ball.vy === 0, `y=${s.ball.y}`)
}

/* --- Jugador ------------------------------------------------------------- */
{
  const s = playing()
  const p = s.players[0]
  let top = p.y
  for (let i = 0; i < 90; i++) {
    stepGame(s, input({ jump: i < 2 }), IDLE, 1 / 60)
    top = Math.min(top, p.y)
  }
  const expected = PLAYER.JUMP_V ** 2 / (2 * PLAYER.GRAVITY)
  const height = FIELD.GROUND_Y - top
  check('altura de salto', Math.abs(height - expected) < 8, `${height.toFixed(1)} u (esperado ~${expected.toFixed(1)})`)
  check('aterriza', p.grounded && p.y === FIELD.GROUND_Y)

  run(s, 5, input({ move: -1 }))
  check('no pasa de su pared', p.x === PLAYER.MIN_X, `x=${p.x}`)

  // Lejos del vinilo, que si no lo empuja y se cuela un gol por el camino.
  s.ball.x = 100
  run(s, 6, input({ move: 1 }))
  const gap = s.players[1].x - p.x
  check('no atraviesa al rival', gap >= PLAYER.HEAD_R * 2 - 0.01, `separación ${gap.toFixed(2)}`)
  check('ni lo saca del campo', s.players[1].x <= FIELD.W - PLAYER.MIN_X)
}

/* --- Chut ---------------------------------------------------------------- */
{
  const s = playing()
  const p = s.players[0]
  s.ball.x = p.x + 50
  s.ball.y = FIELD.GROUND_Y - BALL.R
  s.ball.vx = 0
  s.ball.vy = 0
  let kicked = false
  for (let i = 0; i < 20 && !kicked; i++) {
    stepGame(s, input({ kick: true }), IDLE, 1 / 60)
    kicked = s.events.some((e) => e.type === 'kick' && e.side === 0)
  }
  check('el pie alcanza un vinilo delante', kicked)
  check('el chut sale hacia la portería rival y hacia arriba', s.ball.vx > 400 && s.ball.vy < 0, `v=(${s.ball.vx.toFixed(0)}, ${s.ball.vy.toFixed(0)})`)
}
{
  const s = playing()
  const p = s.players[0]
  s.ball.x = p.x - 50
  s.ball.y = FIELD.GROUND_Y - BALL.R
  let kicked = false
  for (let i = 0; i < 20; i++) {
    stepGame(s, input({ kick: true }), IDLE, 1 / 60)
    kicked = kicked || s.events.some((e) => e.type === 'kick')
  }
  check('el pie no golpea un vinilo a la espalda', !kicked)
}

/* --- Cabezazo ------------------------------------------------------------ */
{
  const s = playing()
  const p = s.players[0]
  s.ball.x = p.x + 8
  s.ball.y = 60
  s.ball.vx = 0
  s.ball.vy = 0
  let headed = false
  for (let i = 0; i < 120 && !headed; i++) {
    stepGame(s, IDLE, IDLE, 1 / 60)
    headed = s.events.some((e) => e.type === 'head' && e.side === 0)
  }
  check('un vinilo que cae sobre la cabeza es un cabezazo', headed)
  check('y sale hacia arriba y hacia delante', s.ball.vy < -200 && s.ball.vx > 0, `v=(${s.ball.vx.toFixed(0)}, ${s.ball.vy.toFixed(0)})`)
}

/* --- Goles --------------------------------------------------------------- */
{
  const s = playing()
  s.ball.x = FIELD.W - 200
  s.ball.y = FIELD.GROUND_Y - BALL.R
  s.ball.vx = 700
  s.players[1].x = FIELD.W / 2 + 60
  let goal = false
  for (let i = 0; i < 60 && !goal; i++) {
    stepGame(s, IDLE, IDLE, 1 / 60)
    goal = s.events.some((e) => e.type === 'goal' && e.side === 0)
  }
  check('un tiro raso a la portería derecha es gol del jugador izquierdo', goal && s.score[0] === 1 && s.score[1] === 0)
  check('tras el gol el partido se congela', s.phase === 'goal')
  const frozen = JSON.stringify([s.ball, s.players])
  run(s, MATCH.GOAL_FREEZE * 0.5)
  check('congelado de verdad: nada se mueve', JSON.stringify([s.ball, s.players]) === frozen)
  check('durante la pausa no se vuelve a contar', s.score[0] === 1)
  run(s, MATCH.GOAL_FREEZE * 0.5 + 0.05)
  check('sin música, el drop cae a la pausa fija', s.phase === 'drop')
  run(s, MATCH.DROP_AFTER + 0.05)
  const inPlace = s.players[0].x === PLAYER.START_X && s.players[1].x === FIELD.W - PLAYER.START_X
  check('después se saca con todos en su sitio', (s.phase === 'kickoff' || s.phase === 'play') && inPlace && s.ball.x === FIELD.W / 2)
}
{
  const s = playing()
  s.ball.x = 200
  s.ball.y = FIELD.GROUND_Y - BALL.R
  s.ball.vx = -700
  s.players[0].x = FIELD.W / 2 - 60
  run(s, 1)
  check('y en la izquierda es gol del jugador derecho', s.score[0] === 0 && s.score[1] === 1)
}
{
  // Por encima del larguero: no es gol, y el techo inclinado lo devuelve al campo.
  const s = playing()
  s.ball.x = 250
  s.ball.y = FIELD.GROUND_Y - GOAL.HEIGHT - 90
  s.ball.vx = -500
  s.ball.vy = -100
  s.players[0].x = FIELD.W / 2 - 60
  run(s, 4)
  check('un vinilo por encima del larguero no es gol', s.score[1] === 0, `marcador ${s.score}`)
  check('y no se queda encima de la portería', s.ball.x > GOAL.DEPTH, `x=${s.ball.x.toFixed(1)}`)
}

/* --- Reloj --------------------------------------------------------------- */
{
  const s = playing()
  s.score[0] = 1
  run(s, MATCH.DURATION + 1)
  check('con ventaja, el partido acaba al llegar el reloj a cero', s.phase === 'ended' && s.timeLeft === 0)
}
{
  const s = playing()
  run(s, MATCH.DURATION + 1)
  check('con empate hay gol de oro', s.phase === 'play' && s.golden && s.timeLeft === 0)
  s.ball.x = FIELD.W - 200
  s.ball.y = FIELD.GROUND_Y - BALL.R
  s.ball.vx = 700
  s.players[1].x = FIELD.W / 2 + 60
  run(s, MATCH.GOAL_FREEZE + MATCH.DROP_AFTER + 1.5)
  check('y el gol de oro acaba el partido', s.phase === 'ended' && s.score[0] === 1)
}

/* --- Prueba aleatoria: dos jugadores haciendo de todo -------------------- */
{
  const r = rng(1234)
  let s = createInitialState()
  const total = [0, 0]
  let matches = 0
  let outOfBounds = 0
  let firstOut = ''
  let notFinite = 0
  let stuck = 0
  let maxStuck = 0
  let in0 = IDLE
  let in1 = IDLE
  const frames = 60 * 600
  for (let i = 0; i < frames; i++) {
    if (i % 12 === 0) {
      in0 = randomInput(r)
      in1 = randomInput(r)
    }
    stepGame(s, in0, in1, 1 / 60)
    if (s.phase === 'ended') {
      total[0] += s.score[0]
      total[1] += s.score[1]
      matches++
      s = createInitialState()
    }
    const b = s.ball
    if (!Number.isFinite(b.x + b.y + b.vx + b.vy)) notFinite++
    const eps = 0.01
    if (b.x < BALL.R - eps || b.x > FIELD.W - BALL.R + eps || b.y < BALL.R - eps || b.y > FIELD.GROUND_Y - BALL.R + eps) {
      outOfBounds++
      firstOut ||= `vinilo en (${b.x.toFixed(1)}, ${b.y.toFixed(1)})`
    }
    for (const p of s.players) {
      if (p.x < PLAYER.MIN_X || p.x > FIELD.W - PLAYER.MIN_X || p.y > FIELD.GROUND_Y) {
        outOfBounds++
        firstOut ||= `jugador ${p.side} en (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`
      }
    }
    // «Atrapado»: metido de verdad dentro de la cabeza de alguien.
    const inside = s.players.some((p) => Math.hypot(b.x - p.x, b.y - (p.y - PLAYER.HEAD_CY)) < PLAYER.HEAD_R + BALL.R - 3)
    stuck = inside ? stuck + 1 : 0
    maxStuck = Math.max(maxStuck, stuck)
  }
  check('10 minutos de caos: ningún número roto', notFinite === 0)
  check('10 minutos de caos: nada se sale del campo', outOfBounds === 0, outOfBounds ? `${outOfBounds} frames fuera; el primero: ${firstOut}` : '')
  check('10 minutos de caos: el vinilo nunca se queda atrapado', maxStuck < 12, `máximo ${maxStuck} frames seguidos`)
  check('10 minutos de caos: se juegan partidos enteros y hay goles', matches >= 5 && total[0] + total[1] > 0, `${matches} partidos, goles ${total}`)
  // Los dos lados juegan con las mismas reglas y el mismo azar: si uno marca
  // muchísimo más que el otro, es que la física no es simétrica.
  const ratio = Math.min(total[0], total[1]) / Math.max(total[0], total[1], 1)
  check('10 minutos de caos: ningún lado tiene ventaja', ratio > 0.5, `goles ${total}`)
}

/* --- Determinismo e independencia de los fps ----------------------------- */
{
  function simulate(fps: number): GameState {
    const r = rng(99)
    const s = createInitialState()
    let in0 = IDLE
    let in1 = IDLE
    let lastTick = -1
    // Los inputs se eligen por tick de simulación, no por frame: es lo que
    // hace comparable una ejecución a 60 Hz con otra a 144.
    while (s.tick < 120 * 30) {
      const slot = Math.floor(s.tick / 24)
      if (slot !== lastTick) {
        lastTick = slot
        in0 = randomInput(r)
        in1 = randomInput(r)
      }
      const before = s.tick
      stepGame(s, in0, in1, 1 / fps)
      // A 60 Hz caben dos ticks por frame: se corta en la frontera del tramo.
      if (Math.floor(before / 24) !== Math.floor(s.tick / 24) && s.tick % 24 !== 0) {
        throw new Error('la prueba necesita frames alineados con los tramos de input')
      }
    }
    return s
  }
  const a = simulate(60)
  const b = simulate(60)
  check('mismos inputs, mismo partido', JSON.stringify(a.ball) === JSON.stringify(b.ball) && a.score.join() === b.score.join())
  const c = simulate(120)
  check('el resultado no depende de los fps', JSON.stringify(a.ball) === JSON.stringify(c.ball) && a.score.join() === c.score.join(), `60 Hz: ${JSON.stringify(a.score)} · 120 Hz: ${JSON.stringify(c.score)}`)
  check('el paso de simulación es de 1/120 s', SIM.DT === 1 / 120)
}

console.log(failures === 0 ? '\n✔ física: todo correcto' : `\n✘ física: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
