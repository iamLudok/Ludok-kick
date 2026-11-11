/**
 * La escalera de rivales, los logros por rival y las monedas, contra
 * historiales inventados.
 */
import { DJS, STARTER } from '../src/content/djs'
import { BADGES, LADDER, badgesAgainst, ladderState, levelOfRung, unlockedBy } from '../src/content/ladder'
import { coinsFor } from '../src/lib/progress'
import type { MatchRecord } from '../src/types'

let failures = 0
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

let t = 0
function match(p: Partial<MatchRecord>): MatchRecord {
  t++
  return { id: `m${t}`, playedAt: t, goalsFor: 0, goalsAgainst: 0, goldenGoal: false, perfects: 0, goods: 0, powers: 1, kicks: 5, jumps: 5, dashes: 5, rivalDj: LADDER[0], ...p }
}
const W = (p: Partial<MatchRecord> = {}) => match({ goalsFor: 2, goalsAgainst: 1, ...p })
const L = (p: Partial<MatchRecord> = {}) => match({ goalsFor: 0, goalsAgainst: 1, ...p })

/* --- La escalera --------------------------------------------------------- */
{
  check('todos los DJs menos el inicial están en la escalera, una vez', LADDER.length === DJS.length - 1 && new Set(LADDER).size === LADDER.length && !LADDER.includes(STARTER))
  const start = ladderState([])
  check('al empezar solo está abierto el primer rival', start.open === 1)
  check('y solo se juega con el inicial', start.playable.size === 1 && start.playable.has(STARTER))
  check('perder no abre el siguiente', ladderState([L()]).open === 1)
  const one = ladderState([W()])
  check('ganarle al primero abre el segundo', one.open === 2)
  check('y lo desbloquea para jugar con él', one.playable.has(LADDER[0]))
  check('ganar a uno que no toca no salta escalones', ladderState([W({ rivalDj: LADDER[5] })]).open === 1)
  check('aunque sí desbloquea a ese DJ (de partidos de antes de la escalera)', ladderState([W({ rivalDj: LADDER[5] })]).playable.has(LADDER[5]))
  const all = LADDER.map((id) => W({ rivalDj: id }))
  check('ganando a todos, todo abierto', ladderState(all).open === LADDER.length && ladderState(all).playable.size === DJS.length)
  check('en modo prueba, todo abierto desde el principio', ladderState([], true).open === LADDER.length && ladderState([], true).playable.size === DJS.length)
  check('la dificultad sube con la escalera', levelOfRung(0) === 'warmup' && levelOfRung(4) === 'peak' && levelOfRung(LADDER.length - 1) === 'closing')
}

/* --- Logros por rival ----------------------------------------------------- */
{
  const r = LADDER[0]
  const other = LADDER[1]
  const has = (h: MatchRecord[], b: string, rival = r) => badgesAgainst(h, rival).has(b as never)
  check('ganar sin encajar', has([W({ goalsFor: 1, goalsAgainst: 0 })], 'clean') && !has([W()], 'clean'))
  check('perder sin encajar no cuenta', !has([match({ goalsFor: 0, goalsAgainst: 0 })], 'clean'))
  check('ganar por 5', has([W({ goalsFor: 6, goalsAgainst: 1 })], 'rout') && !has([W({ goalsFor: 5, goalsAgainst: 1 })], 'rout'))
  check('ganar con gol de oro', has([W({ goldenGoal: true })], 'golden'))
  check('ganar sin habilidad, sin dash, sin chutar, sin saltar', has([W({ powers: 0 })], 'nopower') && has([W({ dashes: 0 })], 'nodash') && has([W({ kicks: 0 })], 'nokick') && has([W({ jumps: 0 })], 'nojump'))
  check('un partido de antes de contar acciones no regala los «sin…»', !has([W({ kicks: undefined, jumps: undefined, dashes: undefined, powers: undefined })], 'nojump'))
  check('9 victorias no son 10', !has(Array.from({ length: 9 }, () => W()), 'ten'))
  check('10, sí', has(Array.from({ length: 10 }, () => W()), 'ten'))
  check('los logros son de cada rival', !has([W({ goalsAgainst: 0, rivalDj: other })], 'clean'))
  check('hay ocho logros por rival', BADGES.length === 8)
}

/* --- Lo que desbloquea un partido ---------------------------------------- */
{
  const before = [L()]
  const after = [...before, W({ goalsFor: 1, goalsAgainst: 0, jumps: 0 })]
  const got = unlockedBy(before, after, LADDER[0])
  check('ganarle al rival lo desbloquea', got.djs.includes(LADDER[0]))
  check('y da sus logros de ese partido', got.badges.includes('clean') && got.badges.includes('nojump'), got.badges.join(', '))
  check('repetir no los vuelve a dar', unlockedBy(after, [...after, W({ goalsFor: 1, goalsAgainst: 0 })], LADDER[0]).badges.length === 0)
}

/* --- Monedas ------------------------------------------------------------- */
{
  const lose = coinsFor({ goalsFor: 1, goalsAgainst: 3, perfects: 2, rung: 0, newBadges: 0 })
  const win = coinsFor({ goalsFor: 3, goalsAgainst: 1, perfects: 2, rung: 0, newBadges: 0 })
  check('perder también da algo', lose > 0)
  check('ganar da bastante más', win > lose * 2, `${lose} / ${win}`)
  check('los rivales de arriba pagan más', coinsFor({ goalsFor: 3, goalsAgainst: 1, perfects: 2, rung: 9, newBadges: 0 }) > win)
  check('y un logro nuevo, más aún', coinsFor({ goalsFor: 3, goalsAgainst: 1, perfects: 2, rung: 0, newBadges: 2 }) > win + 50)
}

console.log(failures === 0 ? '\n✔ escalera: todo correcto' : `\n✘ escalera: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
