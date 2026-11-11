/**
 * Las misiones, una por una, contra historiales inventados: que cada una se
 * cumple justo cuando debe (y no antes), que el orden de los partidos solo
 * importa donde tiene que importar, y que el desbloqueo se calcula bien.
 */
import { DJS, STARTER } from '../src/content/djs'
import { MISSIONS, isDone, missionFor, newlyUnlocked, unlockedDjs } from '../src/content/missions'
import type { MatchRecord } from '../src/types'

let failures = 0
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  ok  ' : ' FALLO'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

let t = 0
function match(p: Partial<MatchRecord>): MatchRecord {
  t++
  return { id: `m${t}`, playedAt: t, goalsFor: 0, goalsAgainst: 0, goldenGoal: false, perfects: 0, goods: 0, level: 'warmup', stage: 'bilbao', ...p }
}
const W = (p: Partial<MatchRecord> = {}) => match({ goalsFor: 2, goalsAgainst: 1, ...p })
const L = (p: Partial<MatchRecord> = {}) => match({ goalsFor: 0, goalsAgainst: 1, ...p })
const done = (dj: Parameters<typeof missionFor>[0], h: MatchRecord[]) => isDone(missionFor(dj)!, h)

check('cada DJ menos el inicial tiene su misión', DJS.every((d) => d.id === STARTER || missionFor(d.id) !== undefined))
check('y ninguno tiene dos', new Set(MISSIONS.map((m) => m.dj)).size === MISSIONS.length)
check('sin jugar, solo está el inicial', unlockedDjs([]).size === 1 && unlockedDjs([]).has(STARTER))
check('en modo prueba, todos', unlockedDjs([], true).size === DJS.length)

check('perder no cuenta como primera victoria', !done('karl', [L()]))
check('ganar sí', done('karl', [L(), W()]))
check('un empate no es una victoria', !done('karl', [match({ goalsFor: 1, goalsAgainst: 1 })]))

check('5 PERFECT no bastan para 6', !done('mismonik', [W({ perfects: 5 }), L({ perfects: 5 })]))
check('6 en un partido, sí (aunque se pierda)', done('mismonik', [L({ perfects: 6 })]))

check('ganar en Warm-up no vale para Peak Time', !done('daft', [W()]))
check('ganar en Closing también vale', done('daft', [W({ level: 'closing' })]))

check('ganar encajando no vale para la portería a cero', !done('deadmouse', [W()]))
check('ganar 1–0, sí', done('deadmouse', [W({ goalsFor: 1, goalsAgainst: 0 })]))
check('perder 0–0 no cuenta', !done('deadmouse', [match({ goalsFor: 0, goalsAgainst: 0 })]))

check('partidos de antes de contar poderes no rompen nada', !done('marsmelou', [W({ powers: undefined })]))
check('3 poderes en un partido', done('marsmelou', [L({ powers: 3 })]))




{
  const a = W()
  const b = W()
  const c = L()
  const d = W()
  check('ganar 3 pero no seguidos no vale', !done('ritxie', [a, b, c, d]))
  check('3 seguidos, sí', done('ritxie', [a, b, c, d, W(), W()]))
  // El orden lo da la fecha, no el orden en que vengan de la base.
  check('el orden lo da la fecha del partido', done('ritxie', [W({ playedAt: 103 }), L({ playedAt: 99 }), W({ playedAt: 101 }), W({ playedAt: 102 })]))
}

check('ganar en Peak no vale para Closing', !done('solomoon', [W({ level: 'peak' })]))
check('ganar en Closing', done('solomoon', [W({ level: 'closing' })]))

check('9 victorias no son 10', !done('klaptone', Array.from({ length: 9 }, () => W())))
check('10 sí', done('klaptone', Array.from({ length: 10 }, () => W())))

check('ganar a Closing por 2 no basta', !done('boris', [W({ level: 'closing', goalsFor: 3, goalsAgainst: 1 })]))
check('por 3, sí', done('boris', [W({ level: 'closing', goalsFor: 4, goalsAgainst: 1 })]))

{
  // Un historial que cumple todas las demás.
  const all = [
    W({ goalsFor: 4, goalsAgainst: 0, level: 'closing', perfects: 6, powers: 3, bestStreak: 5, goldenGoal: true }),
    W({ stage: 'donostia' }),
    W({ stage: 'caserio' }),
    ...Array.from({ length: 7 }, () => W()),
  ]
  check('con todo lo demás, la última misión se cumple', done('ihm', all))
  check('y están todos desbloqueados', unlockedDjs(all).size === DJS.length)
  check('sin una de las otras, la última no', !done('ihm', all.slice(0, -1).map((m) => ({ ...m, goldenGoal: false }))))
}

{
  const before = [L()]
  const after = [...before, W({ goalsFor: 1, goalsAgainst: 0 })]
  const fresh = newlyUnlocked(before, after)
  check('un partido puede desbloquear varios a la vez', fresh.includes('karl') && fresh.includes('deadmouse'), fresh.join(', '))
  check('y no repite los que ya estaban', newlyUnlocked(after, [...after, W()]).every((id) => id !== 'karl'))
}

console.log(failures === 0 ? '\n✔ misiones: todo correcto' : `\n✘ misiones: ${failures} fallo(s)`)
process.exit(failures === 0 ? 0 : 1)
