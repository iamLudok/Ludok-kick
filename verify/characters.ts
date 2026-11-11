/**
 * Prueba el contenido: que cada DJ tiene la ventaja que dice y su poder, que
 * ninguno descompensa el juego, que todas las bases dejan el bombo en las
 * negras y que lo que llega por la ruta se lee bien aunque venga mal.
 */
import { DJS, getDj, pickRival } from '../src/content/djs'
import { readResult, readSetup, resultParams, setupParams } from '../src/content/setup'
import { GENRES } from '../src/content/genres'
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
/** El primer DJ que tiene esa ventaja por encima de lo normal. */
const withPerk = (stat: 'speed' | 'jump' | 'kick' | 'timing') => DJS.find((d) => d.stats[stat] > 1)!.stats

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
  const house = ran(withPerk('speed')) - start
  check('el DJ rápido corre más', house > base * 1.05, `${base.toFixed(0)} → ${house.toFixed(0)} u en 0,8 s`)

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
  check('el DJ saltarín salta más', top(withPerk('jump')) > top(BASE_STATS) * 1.12, `${top(BASE_STATS).toFixed(0)} → ${top(withPerk('jump')).toFixed(0)} u`)

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
  check('el DJ de tiro fuerte chuta más fuerte', shot(withPerk('kick')) > shot(BASE_STATS) * 1.08, `${shot(BASE_STATS).toFixed(0)} → ${shot(withPerk('kick')).toFixed(0)}`)

  const edge = (BEAT.PERFECT_MS + 10) / 1000
  check('el DJ preciso tiene la ventana PERFECT más amplia', judgeDelta(edge, BEAT.REFERENCE_BPM, withPerk('timing').timing) === 2 && judgeDelta(edge, BEAT.REFERENCE_BPM, 1) === 1)

  check('cada DJ tiene su poder', DJS.every((d) => d.stats.power !== null))
  check('y los cuatro poderes están repartidos', new Set(DJS.map((d) => d.stats.power)).size === 4)
  // Con 14 DJs se repite algún color de camiseta, pero no la silueta entera:
  // peinado, máscara, gafas, barba y sonrisa juntos.
  const silhouette = (d: (typeof DJS)[number]) => [d.look.hair_style, d.look.mask, d.look.glasses, d.look.beard, d.look.hair, d.look.jersey].join()
  check('ninguno se parece del todo a otro', new Set(DJS.map(silhouette)).size === DJS.length)
  check('ninguna ventaja es exagerada', DJS.every((d) => d.stats.speed <= 1.1 && d.stats.jump <= 1.1 && d.stats.kick <= 1.15 && d.stats.timing <= 1.3))
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
    for (let i = 1; i <= steps; i++) stepGame(s, { ...IDLE, kick: true }, IDLE, 1 / 120, { time: i / 120, t0: steps / 120, bpm: BEAT.REFERENCE_BPM, dropAt: -1 })
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
      // Con 14 DJs hay 182 parejas: 3 partidos por pareja y lado dan unos 80
      // por DJ, suficiente para ver un desequilibrio claro sin tardar minutos.
      for (let k = 0; k < 3; k++) {
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
  check('ningún DJ gana casi siempre', rates.every((r) => r.rate <= 0.7), detail)
  check('ni pierde casi siempre', rates.every((r) => r.rate >= 0.3), detail)
}

/* --- Géneros y escenarios ----------------------------------------------- */
{
  for (const g of GENRES) {
    check(`${g.name}: el bombo, en las cuatro negras`, [...g.pattern.kick].sort((a, b) => a - b).join() === '0,4,8,12')
    check(`${g.name}: tempo jugable`, g.bpm >= 120 && g.bpm <= 145, `${g.bpm} BPM`)
  }
  check('cada DJ pone un género que existe', DJS.every((d) => GENRES.some((g) => g.id === d.genre)))
  for (const st of STAGES) {
    check(`${st.name}: el fondo tiene sus colores`, st.palette.wall.length >= 2 && st.palette.deco.length >= 4)
  }
  check('cada escenario tiene un decorado distinto', new Set(STAGES.map((s) => s.decor)).size === STAGES.length)
}

/* --- Lo que llega por la ruta ------------------------------------------- */
{
  const setup = { dj: 'ritxie' as const, rival: 'klaptone' as const, stage: 'caserio' as const, level: 'closing' as const }
  const back = readSetup(setupParams(setup))
  check('una configuración va y vuelve por la ruta', JSON.stringify(back) === JSON.stringify(setup))
  const junk = readSetup({ dj: 'nadie', rival: 'nadie', stage: 'la luna', nivel: 'imposible' })
  check('lo que no se reconoce cae a valores válidos', getDj(junk.dj).id === junk.dj && STAGES.some((s) => s.id === junk.stage) && junk.level === 'peak')
  check('el rival nunca es tu mismo DJ', readSetup({ dj: 'karl', rival: 'karl' }).rival !== 'karl')
  let same = false
  for (let i = 0; i < 50; i++) if (pickRival('boris') === 'boris') same = true
  check('al azar, tampoco', !same)

  const result = { goalsFor: 3, goalsAgainst: 2, golden: true, perfects: 9, goods: 4, powers: 2, bestStreak: 4 }
  check('un resultado va y vuelve por la ruta', JSON.stringify(readResult(resultParams(result))) === JSON.stringify(result))
  const bad = readResult({ gf: '-3', ga: 'mucho', perfect: '2.7' })
  check('y uno roto no da números raros', bad.goalsFor === 0 && bad.goalsAgainst === 0 && bad.perfects === 2)
  check('las constantes de los jugadores tienen sentido', PLAYER.SPEED > 0)
}

console.log(failures === 0 ? '\n✔ contenido: todo correcto' : `\n✘ contenido: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
