/**
 * Prueba la barra de energía y los cuatro poderes con el mismo código que
 * corre en el móvil: que la barra se llena con PERFECT y solo con PERFECT,
 * que un poder se lanza una vez por pulsación y que cada uno hace lo suyo.
 */
import { BALL, BEAT, DASH, FIELD, MATCH, PLAYER, POWER } from '../src/game/constants'
import { createInitialState, emptyInput } from '../src/game/state'
import { stepGame, type BeatInput } from '../src/game/step'
import type { GameEvent, GameState, InputFrame, PowerKind } from '../src/game/types'

let failures = 0
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

const IDLE = emptyInput()
const DT = 1 / 60
const input = (p: Partial<InputFrame>): InputFrame => ({ ...emptyInput(), ...p })

function playing(seed = 1): GameState {
  const s = createInitialState(undefined, undefined, seed)
  for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, DT)
  return s
}

function run(s: GameState, seconds: number, in0: InputFrame = IDLE, in1: InputFrame = IDLE, beat?: BeatInput): GameEvent[] {
  const out: GameEvent[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    stepGame(s, in0, in1, DT, beat)
    out.push(...s.events)
  }
  return out
}

/** Un chut con el vinilo delante, a `offset` segundos del beat. Devuelve su juicio. */
function kickOnBeat(s: GameState, offset: number): number {
  const p = s.players[0]
  s.ball.x = p.x + 50
  s.ball.y = FIELD.GROUND_Y - BALL.R
  s.ball.vx = 0
  s.ball.vy = 0
  // Primero se mide, en una copia, cuántos pasos tarda el pie en tocarlo.
  const probe: GameState = structuredClone(s)
  let steps = 0
  while (steps < 60) {
    stepGame(probe, input({ kick: true }), IDLE, 1 / 120)
    steps++
    if (probe.events.some((e) => e.type === 'kick')) break
  }
  const t0 = 100 + steps / 120 - offset
  let judge = -1
  for (let i = 1; i <= steps; i++) {
    stepGame(s, input({ kick: true }), IDLE, 1 / 120, { time: 100 + i / 120, t0, bpm: BEAT.REFERENCE_BPM, dropAt: -1 })
    const e = s.events.find((ev) => ev.type === 'kick')
    if (e && e.type === 'kick') judge = e.judge
  }
  // Pie recogido y vinilo lejos para el siguiente.
  run(s, 0.5)
  s.ball.x = FIELD.W / 2
  return judge
}

/* --- La barra de energía ------------------------------------------------- */
{
  const s = playing()
  const p = s.players[0]
  check('se empieza sin energía ni poder', p.energy === 0 && p.power === null)
  kickOnBeat(s, 0.12)
  check('un GOOD no carga energía', p.energy === 0, `energía ${p.energy}`)
  kickOnBeat(s, 0)
  check('un PERFECT sí', p.energy === POWER.PER_PERFECT, `energía ${p.energy}`)
  const perfectsToFill = Math.ceil(1 / POWER.PER_PERFECT)
  for (let i = 1; i < perfectsToFill; i++) kickOnBeat(s, 0)
  check(`con ${perfectsToFill} PERFECT se llena`, p.energy === 1)
  check('y trae un poder', p.power !== null, `${p.power}`)
  const kind = p.power
  kickOnBeat(s, 0)
  check('con la barra llena no se acumula otro', p.energy === 1 && p.power === kind)
}

/** Un jugador con un poder concreto listo para lanzar. */
function withPower(kind: PowerKind, seed = 1): GameState {
  const s = playing(seed)
  s.players[0].energy = 1
  s.players[0].power = kind
  return s
}

/* --- Lanzar ------------------------------------------------------------- */
{
  const s = withPower('scratch')
  const events = run(s, 0.5, input({ power: true }))
  const launches = events.filter((e) => e.type === 'power')
  check('mantener el botón lanza el poder una sola vez', launches.length === 1)
  check('lanzarlo vacía la barra', s.players[0].energy === 0 && s.players[0].power === null)
  const none = playing()
  check('sin poder, el botón no hace nada', run(none, 0.3, input({ power: true })).every((e) => e.type !== 'power'))
}

/* --- Scratch -------------------------------------------------------------- */
{
  // El mismo chut, con y sin Scratch: el que lleva Scratch tiene que bajar antes.
  const shot = (scratch: boolean) => {
    const s = playing()
    if (scratch) {
      s.players[0].power = 'scratch'
      s.players[0].energy = 1
      run(s, 0.1, input({ power: true }))
    }
    const p = s.players[0]
    s.ball.x = p.x + 50
    s.ball.y = FIELD.GROUND_Y - BALL.R
    s.ball.vx = 0
    s.ball.vy = 0
    let landX = -1
    for (let i = 0; i < 240 && landX < 0; i++) {
      stepGame(s, input({ kick: i < 20 }), IDLE, DT)
      if (s.events.some((e) => e.type === 'bounce') && s.ball.x > p.x + 80) landX = s.ball.x
    }
    return { s, landX }
  }
  const plain = shot(false)
  const curved = shot(true)
  check('el Scratch se queda preparado hasta el tiro', curved.s.players[0].scratch === false)
  check('el tiro con Scratch cae antes que el normal', curved.landX > 0 && curved.landX < plain.landX - 40, `normal bota en x=${plain.landX.toFixed(0)}, con Scratch en x=${curved.landX.toFixed(0)}`)
  const armed = withPower('scratch')
  run(armed, 0.1, input({ power: true }))
  armed.score[0] = 0
  armed.phase = 'goal'
  run(armed, MATCH.GOAL_FREEZE + MATCH.DROP_AFTER + 0.2)
  check('un Scratch preparado no se pierde por un gol', armed.players[0].scratch)
}

/* --- Low-pass ------------------------------------------------------------- */
{
  const travel = (lowpass: boolean) => {
    const s = withPower('lowpass')
    s.ball.x = 100
    if (lowpass) run(s, 1 / 60, input({ power: true }))
    const x0 = s.players[1].x
    run(s, 1, IDLE, input({ move: -1 }))
    return { s, dist: x0 - s.players[1].x }
  }
  const normal = travel(false)
  const slowed = travel(true)
  const ratio = slowed.dist / normal.dist
  check('el rival bajo Low-pass anda a cámara lenta', Math.abs(ratio - POWER.SLOW_FACTOR) < 0.08, `×${ratio.toFixed(2)}`)
  check('el que lo lanza no se ralentiza', slowed.s.players[0].slowT === 0)
  run(slowed.s, POWER.LOWPASS_TIME)
  check(`a los ${POWER.LOWPASS_TIME} s se le pasa`, slowed.s.players[1].slowT <= 0)
  const x1 = slowed.s.players[1].x
  run(slowed.s, 0.5, IDLE, input({ move: 1 }))
  check('y vuelve a su velocidad', slowed.s.players[1].x - x1 > PLAYER.SPEED * 0.5 * 0.8)
}

/* --- Loop ----------------------------------------------------------------- */
{
  const s = withPower('loop')
  s.ball.x = 600
  s.ball.y = 300
  s.ball.vx = 400
  s.ball.vy = 200
  run(s, 1 / 60, input({ power: true }))
  run(s, 0.5)
  const hover = FIELD.GROUND_Y - POWER.LOOP_HEIGHT
  check('el vinilo deja de avanzar', Math.abs(s.ball.vx) < 1e-9 && Math.abs(s.ball.x - 600) < 10, `x=${s.ball.x.toFixed(1)}`)
  check('y si estaba bajo, sube a media altura', Math.abs(s.ball.y - hover) < 6, `y=${s.ball.y.toFixed(1)} (objetivo ${hover})`)
  run(s, POWER.LOOP_TIME - 0.7)
  check('flota mientras dura', s.ball.loopT > 0 && Math.abs(s.ball.y - hover) < 6)
  run(s, 0.4)
  check('y luego cae', s.ball.loopT <= 0 && s.ball.y > hover + 5, `y=${s.ball.y.toFixed(1)}`)

  // Un remate rompe el loop.
  const k = withPower('loop')
  const p = k.players[0]
  k.ball.x = p.x + 58
  k.ball.y = FIELD.GROUND_Y - BALL.R
  run(k, 1 / 60, input({ power: true }))
  run(k, 0.4)
  let kicked = false
  for (let i = 0; i < 30 && !kicked; i++) {
    stepGame(k, input({ kick: true }), IDLE, DT)
    kicked = k.events.some((e) => e.type === 'kick')
  }
  run(k, 0.1)
  check('un vinilo en loop se puede chutar de volea', kicked)
  check('y chutarlo rompe el loop', k.ball.loopT <= 0 && k.ball.vx > 300, `v=(${k.ball.vx.toFixed(0)}, ${k.ball.vy.toFixed(0)})`)
}

/* --- Bombo --------------------------------------------------------------- */
{
  const s = withPower('stomp')
  const p = s.players[0]
  s.players[1].x = p.x + 150
  s.ball.x = p.x + 100
  s.ball.y = FIELD.GROUND_Y - BALL.R
  run(s, 1 / 60, input({ power: true }))
  check('el Bombo lanza al rival lejos de ti', s.players[1].vx > 300 && s.players[1].vy < 0)
  check('y aleja el vinilo', s.ball.vx > 300)
  const far = withPower('stomp')
  far.players[1].x = far.players[0].x + 500
  run(far, 1 / 60, input({ power: true }))
  check('pero no alcanza a un rival lejano', Math.abs(far.players[1].vx) < 1)
}

/* --- Manos arriba ------------------------------------------------------------ */
{
  const top = (hype: boolean) => {
    const s = withPower('hype')
    if (hype) run(s, 1 / 60, input({ power: true }))
    let best = s.players[0].y
    for (let i = 0; i < 90; i++) {
      stepGame(s, input({ jump: i < 2 }), IDLE, DT)
      best = Math.min(best, s.players[0].y)
    }
    return FIELD.GROUND_Y - best
  }
  check('con Manos arriba se salta mucho más', top(true) > top(false) * 1.6, `${top(false).toFixed(0)} → ${top(true).toFixed(0)} u`)
}

/* --- Modo robot ---------------------------------------------------------------- */
{
  const s = withPower('robot')
  // Lejos de las porterías: un gol por medio congelaría el partido y la prueba.
  s.ball.x = 500
  s.ball.y = 60
  run(s, 1 / 60, input({ power: true }))
  const x0 = s.players[1].x
  run(s, POWER.ROBOT_TIME - 0.2, IDLE, input({ move: -1, kick: true }))
  check('el rival congelado no se mueve', Math.abs(s.players[1].x - x0) < 0.5)
  check('ni chuta', s.players[1].kickT < 0)
  run(s, 0.4)
  run(s, 0.5, IDLE, input({ move: -1 }))
  check('y luego vuelve a moverse', s.players[1].x < x0 - 50)
}

/* --- Cabeza gigante ------------------------------------------------------------- */
{
  // Un vinilo que cae algo apartado de la cabeza: normal no la toca; gigante, sí.
  const hits = (big: boolean) => {
    const s = withPower('bighead')
    if (big) run(s, 1 / 60, input({ power: true }))
    const p = s.players[0]
    s.ball.x = p.x + PLAYER.HEAD_R + BALL.R + 8
    s.ball.y = 80
    s.ball.vx = 0
    s.ball.vy = 0
    let headed = false
    for (let i = 0; i < 60 && !headed; i++) {
      stepGame(s, IDLE, IDLE, DT)
      headed = s.events.some((e) => e.type === 'head' && e.side === 0)
    }
    return headed
  }
  check('con la cabeza normal ese vinilo pasa de largo', !hits(false))
  check('con la Cabeza gigante lo remata', hits(true))
}

/* --- Nube ------------------------------------------------------------------------ */
{
  const fall = (cloud: boolean) => {
    const s = withPower('cloud')
    s.ball.x = 600
    s.ball.y = 60
    s.ball.vx = 0
    s.ball.vy = 0
    if (cloud) run(s, 1 / 60, input({ power: true }))
    s.ball.y = 60
    s.ball.vy = 0
    run(s, 0.4)
    return s.ball.y - 60
  }
  check('con la Nube el vinilo cae mucho más despacio', fall(true) < fall(false) * 0.5, `${fall(false).toFixed(0)} → ${fall(true).toFixed(0)} u en 0,4 s`)
}

/* --- Muro ------------------------------------------------------------------------- */
{
  const shot = (wall: boolean) => {
    const s = withPower('wall')
    s.players[0].x = 400
    if (wall) run(s, 1 / 60, input({ power: true }))
    // Un tiro raso del rival hacia tu portería (la izquierda).
    s.ball.x = 260
    s.ball.y = FIELD.GROUND_Y - BALL.R
    s.ball.vx = -800
    s.ball.vy = 0
    run(s, 1.2)
    return s.score[1]
  }
  check('sin Muro, ese tiro es gol', shot(false) === 1)
  check('con Muro, el bafle lo para', shot(true) === 0)
}

/* --- Rayo --------------------------------------------------------------------------- */
{
  const s = withPower('laser')
  run(s, 1 / 60, input({ power: true }))
  check('el Rayo se queda preparado', s.players[0].laser)
  const p = s.players[0]
  s.ball.x = p.x + 50
  s.ball.y = FIELD.GROUND_Y - 60
  s.ball.vx = 0
  s.ball.vy = 0
  for (let i = 0; i < 20 && !s.events.some((e) => e.type === 'kick'); i++) stepGame(s, input({ kick: true }), IDLE, DT)
  const y0 = s.ball.y
  run(s, 0.3)
  check('el tiro sale recto, sin caer', Math.abs(s.ball.y - y0) < 1 && s.ball.vx >= POWER.LASER_SPEED * 0.99, `bajó ${(s.ball.y - y0).toFixed(1)} u`)
  check('y se gasta con ese tiro', !p.laser)
}

/* --- Luna ---------------------------------------------------------------------------- */
{
  const top = (moon: boolean) => {
    const s = withPower('moon')
    if (moon) run(s, 1 / 60, input({ power: true }))
    let best = s.players[1].y
    for (let i = 0; i < 120; i++) {
      stepGame(s, IDLE, input({ jump: i < 2 }), DT)
      best = Math.min(best, s.players[1].y)
    }
    return FIELD.GROUND_Y - best
  }
  check('con la Luna también el rival salta más (es para todos)', top(true) > top(false) * 2)
}

/* --- Alas ------------------------------------------------------------------------------- */
{
  const s = withPower('wings')
  run(s, 1 / 60, input({ power: true }))
  let jumps = 0
  let wasRising = false
  for (let i = 0; i < 120; i++) {
    // Pulsa saltar al empezar y otra vez a mitad de la caída.
    stepGame(s, input({ jump: i < 2 || (i > 40 && i < 44) }), IDLE, DT)
    const rising = s.players[0].vy < 0
    if (rising && !wasRising) jumps++
    wasRising = rising
  }
  check('con Alas hay un segundo salto en el aire', jumps === 2, `${jumps} saltos`)
}

/* --- Bufón ------------------------------------------------------------------------------- */
{
  const s = withPower('jester')
  s.ball.x = 500
  s.ball.y = 60
  run(s, 1 / 60, input({ power: true }))
  const x0 = s.players[1].x
  run(s, 0.5, IDLE, input({ move: -1 }))
  check('con el Bufón, el rival que pulsa izquierda va a la derecha', s.players[1].x > x0 + 20)
}

/* --- Apagón -------------------------------------------------------------------------------- */
{
  const s = withPower('blackout')
  s.players[1].energy = 1
  s.players[1].power = 'stomp'
  run(s, 1 / 60, input({ power: true }))
  check('el Apagón le quita al rival lo que tenía cargado', s.players[1].power === null && s.players[1].energy === 0)
  s.players[1].power = 'stomp'
  const events = run(s, 0.2, IDLE, input({ power: true }))
  check('y durante el apagón no puede lanzar nada', !events.some((e) => e.type === 'power' && e.side === 1))
}

/* --- Dash ---------------------------------------------------------------- */
{
  const s = playing()
  s.ball.x = 900
  const x0 = s.players[0].x
  run(s, 1 / 60, input({ dash: 1 }))
  run(s, DASH.TIME)
  const dashed = s.players[0].x - x0
  const walk = playing()
  walk.ball.x = 900
  const w0 = walk.players[0].x
  run(walk, 1 / 60 + DASH.TIME, input({ move: 1 }))
  const walked = walk.players[0].x - w0
  check('el dash recorre mucho más que andar lo mismo', dashed > walked * 1.8, `${walked.toFixed(0)} → ${dashed.toFixed(0)} u`)
  // Primero se deja que frene la inercia del primero (sigue dentro de la espera).
  run(s, 0.3)
  const x1 = s.players[0].x
  run(s, 1 / 60, input({ dash: 1 }))
  run(s, DASH.TIME)
  check('no se puede encadenar otro enseguida', s.players[0].x - x1 < dashed * 0.3)
  const ev = playing()
  check('y cuenta como dash para los logros', run(ev, 1 / 60, input({ dash: -1 })).some((e) => e.type === 'dash'))
}

/* --- Azar reproducible ---------------------------------------------------- */
{
  const draw = (seed: number) => {
    const s = playing(seed)
    for (let i = 0; i < Math.ceil(1 / POWER.PER_PERFECT); i++) kickOnBeat(s, 0)
    return s.players[0].power
  }
  check('misma semilla, mismo poder', draw(7) === draw(7))
  const kinds = new Set<string | null>()
  for (let seed = 1; seed <= 24; seed++) kinds.add(draw(seed))
  check('y con semillas distintas salen muchas distintas', kinds.size >= 8, `${kinds.size}: ${[...kinds].join(', ')}`)
}

console.log(failures === 0 ? '\n✔ poderes: todo correcto' : `\n✘ poderes: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
