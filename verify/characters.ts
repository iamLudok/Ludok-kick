/**
 * Prueba el contenido: que cada DJ tiene la ventaja que dice y su poder, que
 * ninguno descompensa el juego, que todas las bases dejan el bombo en las
 * negras y que lo que llega por la ruta se lee bien aunque venga mal.
 */
import { DJS, getDj, pickRival } from '../src/content/djs'
import { levelOf, readResult, readSetup, resultParams, setupParams } from '../src/content/setup'
import { GENRES } from '../src/content/genres'
import { STAGES } from '../src/content/stages'
import { createAi, stepAi } from '../src/game/ai'
import { judgeDelta } from '../src/game/beat'
import { BALL, BEAT, FIELD, MATCH, PLAYER, POWER } from '../src/game/constants'
import { BASE_STATS, createInitialState, emptyInput } from '../src/game/state'
import { NO_UPGRADES, UPGRADE, evenLevels, statsFor } from '../src/game/upgrades'
import { stepGame } from '../src/game/step'
import type { PlayerStats } from '../src/game/types'

let failures = 0
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

const IDLE = emptyInput()
const DT = 1 / 60

/* --- Cada DJ, su habilidad y su bandera --------------------------------- */
{
  check('cada DJ tiene su habilidad, sin repetir', new Set(DJS.map((d) => d.power)).size === DJS.length)
  check('y su país', DJS.every((d) => typeof d.origin === 'string' && d.origin.length > 0))
  // Peinado, máscara, gafas, vello, color de pelo, boca y camiseta juntos.
  const silhouette = (d: (typeof DJS)[number]) =>
    [d.look.hair, d.look.mask, d.look.glasses, d.look.facialHair, d.look.hairColor, d.look.mouth, d.look.jersey].join()
  check('ninguno se parece del todo a otro', new Set(DJS.map(silhouette)).size === DJS.length)
}

/** Avanza `seconds` con un input fijo, el vinilo apartado para que no estorbe. */
function run(stats: PlayerStats, seconds: number, inp = IDLE) {
  const s = createInitialState(stats)
  for (let i = 0; i < 60; i++) stepGame(s, IDLE, IDLE, DT)
  s.ball.x = FIELD.W - 150
  for (let i = 0; i < seconds * 60; i++) stepGame(s, inp, IDLE, DT)
  return s
}

/* --- Las mejoras se notan ----------------------------------------------- */
{
  const base = statsFor(NO_UPGRADES, null)
  check('sin mejoras, todo a 1', base.speed === 1 && base.kick === 1 && base.jump === 1 && base.dash === 1 && base.charge === 1)
  const top = statsFor(evenLevels(UPGRADE.MAX_LEVEL), null)
  check('a tope, todo sube', top.speed > 1.1 && top.kick > 1.1 && top.jump > 1.1 && top.dash > 1.1 && top.charge > 1.1, JSON.stringify(top))
  check('pero sin pasarse', top.speed <= 1.25 && top.jump <= 1.2 && top.kick <= 1.3)
  check('un nivel por encima del máximo no cuenta', statsFor(evenLevels(UPGRADE.MAX_LEVEL + 5), null).speed === top.speed)
  const ran = (st: PlayerStats) => run(st, 0.8, { ...IDLE, move: 1 }).players[0].x
  check('con la velocidad mejorada se corre más', ran(top) > ran(base) + 10)
}

/* --- Al llenar la barra sale el poder del DJ ----------------------------- */
{
  for (const dj of DJS) {
    const s = createInitialState(statsFor(NO_UPGRADES, dj.power))
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
    check(`${dj.name} carga su propia habilidad`, p.power === dj.power, `${p.power}`)
  }
}

/* --- Equilibrio ---------------------------------------------------------- */
{
  // La misma IA con cada pareja de DJs, a los dos lados y con las mismas
  // estadísticas: lo único distinto es la habilidad. Ninguna debería ganar
  // casi siempre ni perder casi siempre.
  const wins: Record<string, number> = {}
  const games: Record<string, number> = {}
  for (const a of DJS) {
    for (const b of DJS) {
      if (a === b) continue
      // Con 14 DJs hay 182 parejas: 3 partidos por pareja y lado dan unos 80
      // por DJ, suficiente para ver un desequilibrio claro sin tardar minutos.
      for (let k = 0; k < 3; k++) {
        const s = createInitialState(statsFor(NO_UPGRADES, a.power), statsFor(NO_UPGRADES, b.power), k + 1)
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
  const setup = { dj: 'ritxie' as const, rival: 'klaptone' as const, stage: 'caserio' as const }
  const back = readSetup(setupParams(setup))
  check('una configuración va y vuelve por la ruta', JSON.stringify(back) === JSON.stringify(setup))
  const junk = readSetup({ dj: 'nadie', rival: 'nadie', stage: 'la luna', nivel: 'imposible' })
  check('lo que no se reconoce cae a valores válidos', getDj(junk.dj).id === junk.dj && STAGES.some((s) => s.id === junk.stage) && junk.rival !== junk.dj)
  check('el nivel lo da el escalón del rival', levelOf({ dj: 'ludok', rival: 'karl', stage: 'bilbao' }) === 'warmup' && levelOf({ dj: 'ludok', rival: 'ihm', stage: 'bilbao' }) === 'closing')
  check('el rival nunca es tu mismo DJ', readSetup({ dj: 'karl', rival: 'karl' }).rival !== 'karl')
  let same = false
  for (let i = 0; i < 50; i++) if (pickRival('boris') === 'boris') same = true
  check('al azar, tampoco', !same)

  const result = { goalsFor: 3, goalsAgainst: 2, golden: true, perfects: 9, goods: 4, powers: 2, bestStreak: 4, coins: 140, newDjs: ['karl' as const], newBadges: ['clean' as const, 'nojump' as const] }
  check('un resultado va y vuelve por la ruta', JSON.stringify(readResult(resultParams(result))) === JSON.stringify(result))
  const bad = readResult({ gf: '-3', ga: 'mucho', perfect: '2.7', nuevos: 'nadie,karl', logros: 'trampa' })
  check('y uno roto no da números raros', bad.goalsFor === 0 && bad.goalsAgainst === 0 && bad.perfects === 2)
  check('ni DJs ni logros que no existen', bad.newDjs.join() === 'karl' && bad.newBadges.length === 0)
  check('las constantes de los jugadores tienen sentido', PLAYER.SPEED > 0)
}

console.log(failures === 0 ? '\n✔ contenido: todo correcto' : `\n✘ contenido: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
