/**
 * Prueba el contenido: que cada DJ tiene la ventaja que dice y su poder, que
 * ninguno descompensa el juego, que todas las bases dejan el bombo en las
 * negras y que lo que llega por la ruta se lee bien aunque venga mal.
 */
import { DJS, getDj, pickRival } from '../src/content/djs'
import { readResult, readSetup, resultParams, setupParams } from '../src/content/setup'
import { STAGES } from '../src/content/stages'
import { createAi, stepAi } from '../src/game/ai'
import { judgeDelta } from '../src/game/beat'
import { BALL, BEAT, FIELD, MATCH, PLAYER, POWER } from '../src/game/constants'
import { BASE_STATS, createInitialState, emptyInput } from '../src/game/state'
import { stepGame } from '../src/game/step'
import type { PlayerStats } from '../src/game/types'

let failures = 0
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

const IDLE = emptyInput()
const DT = 1 / 60

/* --- Cada DJ tiene su ventaja -------------------------------------------- */
const byStyle = (style: string) => DJS.find((d) => d.style === style)!.stats

function run(stats: PlayerStats, seconds: number, inp = IDLE) {
  const s = createInitialState(stats)
  for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, DT)
  s.ball.x = FIELD.W - 150
  for (let i = 0; i < seconds * 60; i++) stepGame(s, inp, IDLE, DT)
  return s
}
{
  const ran = (st: PlayerStats) => run(st, 0.8, { ...IDLE, move: 1 }).players[0].x
  // En proporción a lo recorrido, no en unidades: así la prueba sigue valiendo si se retoca la ventaja.
  const start = createInitialState().players[0].x
  const base = ran(BASE_STATS) - start
  const house = ran(byStyle('House')) - start
  check('House corre más', house > base * 1.05, `${base.toFixed(0)} → ${house.toFixed(0)} u en 0,8 s`)

  const top = (st: PlayerStats) => {
    const s = createInitialState(st)
    for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, DT)
    let best = s.players[0].y
    for (let i = 0; i < 60; i++) {
      stepGame(s, { ...IDLE, jump: i < 2 }, IDLE, DT)
      best = Math.min(best, s.players[0].y)
    }
    return FIELD.GROUND_Y - best
  }
  check('Trance salta más', top(byStyle('Trance')) > top(BASE_STATS) * 1.15, `${top(BASE_STATS).toFixed(0)} → ${top(byStyle('Trance')).toFixed(0)} u`)

  const shot = (st: PlayerStats) => {
    const s = createInitialState(st)
    for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, DT)
    s.ball.x = s.players[0].x + 50
    s.ball.y = FIELD.GROUND_Y - BALL.R
    for (let i = 0; i < 20; i++) {
      stepGame(s, { ...IDLE, kick: true }, IDLE, DT)
      if (s.events.some((e) => e.type === 'kick')) break
    }
    return s.ball.vx
  }
  check('Hard techno chuta más fuerte', shot(byStyle('Hard techno')) > shot(BASE_STATS) * 1.08, `${shot(BASE_STATS).toFixed(0)} → ${shot(byStyle('Hard techno')).toFixed(0)}`)

  const edge = (BEAT.PERFECT_MS + 10) / 1000
  check('Minimal tiene la ventana PERFECT más amplia', judgeDelta(edge, BEAT.BPM_START, byStyle('Minimal').timing) === 2 && judgeDelta(edge, BEAT.BPM_START, 1) === 1)

  check('cada DJ tiene un poder propio y distinto', new Set(DJS.map((d) => d.stats.power)).size === DJS.length && DJS.every((d) => d.stats.power !== null))
  check('y un color propio', new Set(DJS.map((d) => d.look.jersey)).size === DJS.length)
  check('y una silueta propia', new Set(DJS.map((d) => d.look.head)).size === DJS.length)
}

/* --- Al llenar la barra sale el poder del DJ ----------------------------- */
{
  for (const dj of DJS) {
    const s = createInitialState(dj.stats)
    const p = s.players[0]
    p.energy = 1 - POWER.PER_PERFECT
    for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, DT)
    s.ball.x = p.x + 50
    s.ball.y = FIELD.GROUND_Y - BALL.R
    // Un chut en el beat: se busca el instante de contacto y se pone ahí el beat.
    const probe = structuredClone(s)
    let steps = 0
    while (steps < 60) {
      stepGame(probe, { ...IDLE, kick: true }, IDLE, 1 / 120)
      steps++
      if (probe.events.some((e) => e.type === 'kick')) break
    }
    for (let i = 1; i <= steps; i++) stepGame(s, { ...IDLE, kick: true }, IDLE, 1 / 120, { time: i / 120, t0: steps / 120, bpm: BEAT.BPM_START, dropAt: -1 })
    check(`${dj.name} carga su propio poder`, p.power === dj.stats.power, `${p.power}`)
  }
}

/* --- Equilibrio ---------------------------------------------------------- */
{
  // La misma IA con cada pareja de DJs, a los dos lados. Ninguno debería ganar
  // casi siempre ni perder casi siempre: las ventajas son matices.
  const wins: Record<string, number> = {}
  const games: Record<string, number> = {}
  for (const a of DJS) {
    for (const b of DJS) {
      if (a === b) continue
      // 10 por pareja y lado: con menos, el ruido movía los porcentajes más que
      // las propias ventajas.
      for (let k = 0; k < 10; k++) {
        const s = createInitialState(a.stats, b.stats, k + 1)
        const ai = [createAi('peak', k * 7 + 1), createAi('peak', k * 13 + 5)]
        const beat = { time: 0, t0: 0.3, bpm: 120, dropAt: -1 }
        let t = 0
        for (let i = 0; i < 60 * (MATCH.DURATION + 60) && s.phase !== 'ended'; i++) {
          t += DT
          beat.time = t
          stepGame(s, { ...stepAi(ai[0], s, 0, DT) }, { ...stepAi(ai[1], s, 1, DT) }, DT, beat)
          for (const e of s.events) if (e.type === 'goal') beat.dropAt = e.at + MATCH.GOAL_FREEZE
        }
        games[a.id] = (games[a.id] ?? 0) + 1
        games[b.id] = (games[b.id] ?? 0) + 1
        if (s.score[0] > s.score[1]) wins[a.id] = (wins[a.id] ?? 0) + 1
        if (s.score[1] > s.score[0]) wins[b.id] = (wins[b.id] ?? 0) + 1
      }
    }
  }
  const rates = DJS.map((d) => ({ name: d.name, rate: (wins[d.id] ?? 0) / games[d.id] }))
  const detail = rates.map((r) => `${r.name} ${Math.round(r.rate * 100)} %`).join(', ')
  check('ningún DJ gana casi siempre', rates.every((r) => r.rate <= 0.68), detail)
  check('ni pierde casi siempre', rates.every((r) => r.rate >= 0.32), detail)
}

/* --- Escenarios ---------------------------------------------------------- */
{
  for (const st of STAGES) {
    check(`${st.name}: el bombo, en las cuatro negras`, [...st.pattern.kick].sort((a, b) => a - b).join() === '0,4,8,12')
    check(`${st.name}: el fondo tiene sus colores`, st.palette.wall.length >= 2 && st.palette.deco.length >= 4)
  }
  check('cada escenario tiene un decorado distinto', new Set(STAGES.map((s) => s.decor)).size === STAGES.length)
}

/* --- Lo que llega por la ruta ------------------------------------------- */
{
  const setup = { dj: 'txiki' as const, rival: 'etxe' as const, stage: 'caserio' as const, level: 'closing' as const }
  const back = readSetup(setupParams(setup))
  check('una configuración va y vuelve por la ruta', JSON.stringify(back) === JSON.stringify(setup))
  const junk = readSetup({ dj: 'nadie', rival: 'nadie', stage: 'la luna', nivel: 'imposible' })
  check('lo que no se reconoce cae a valores válidos', getDj(junk.dj).id === junk.dj && STAGES.some((s) => s.id === junk.stage) && junk.level === 'peak')
  check('el rival nunca es tu mismo DJ', readSetup({ dj: 'burdina', rival: 'burdina' }).rival !== 'burdina')
  let same = false
  for (let i = 0; i < 50; i++) if (pickRival('ilargi') === 'ilargi') same = true
  check('al azar, tampoco', !same)

  const result = { goalsFor: 3, goalsAgainst: 2, golden: true, perfects: 9, goods: 4, powers: 2 }
  check('un resultado va y vuelve por la ruta', JSON.stringify(readResult(resultParams(result))) === JSON.stringify(result))
  const bad = readResult({ gf: '-3', ga: 'mucho', perfect: '2.7' })
  check('y uno roto no da números raros', bad.goalsFor === 0 && bad.goalsAgainst === 0 && bad.perfects === 2)
  check('las constantes de los jugadores tienen sentido', PLAYER.SPEED > 0)
}

console.log(failures === 0 ? '\n✔ contenido: todo correcto' : `\n✘ contenido: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
