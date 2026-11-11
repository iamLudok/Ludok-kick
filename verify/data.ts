/**
 * Ida y vuelta de la copia de seguridad, con el código real de exportar e
 * importar. Lo que se busca es pérdida o mezcla de datos, no errores de tipos.
 */
import { exportAll, importBackup, readSettings, writeSettings, DEFAULT_SETTINGS } from '../src/lib/backupCore'
import { addMatch, listMatches } from '../src/lib/matches'
import { SCHEMA_VERSION } from '../src/lib/version'
import type { BackupFile, MatchRecord } from '../src/types'
import { check, eq, finish, freshDb, freshDbAsCurrent, rejects } from './harness'

/** Compara por contenido: el orden de las claves no es parte del dato. */
function canon(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )
}

async function main() {
  /* --- Ida y vuelta ------------------------------------------------------ */
  const source = await freshDbAsCurrent()
  await writeSettings(source, { ...DEFAULT_SETTINGS, audioOffsetMs: 85, musicVolume: 0.6, lastLevel: 'peak', lastDj: 'minimal', showPerf: true, unlockAll: true })
  const full = await addMatch(
    { goalsFor: 3, goalsAgainst: 2, goldenGoal: true, perfects: 7, goods: 4, powers: 2, bestStreak: 5, level: 'closing', dj: 'karl', rivalDj: 'ludok', stage: 'bilbao' },
    1000,
  )
  // Un partido sin ninguno de los campos opcionales: es donde se cuelan los null.
  const bare = await addMatch({ goalsFor: 0, goalsAgainst: 0, goldenGoal: false, perfects: 0, goods: 0 }, 2000)

  const backup = await exportAll(source)
  const json = JSON.stringify(backup)
  eq('la copia se identifica como de Ludok Kick', backup.app, 'ludok-kick')
  eq('lleva la versión del formato', backup.schemaVersion, SCHEMA_VERSION)
  eq('lleva los dos partidos', backup.matches.length, 2)
  check('el fichero no contiene ningún null', !json.includes('null'), json)
  check('la calibración de audio no viaja en la copia', !json.includes('audioOffsetMs'))
  check('ni el modo prueba', !json.includes('unlockAll'))

  const target = await freshDbAsCurrent()
  // El móvil de destino ya tenía su propia calibración.
  await writeSettings(target, { ...DEFAULT_SETTINGS, audioOffsetMs: 210, lastBackup: 555 })
  const result = await importBackup(target, json)
  eq('importar dice cuántos partidos entraron', result.matches, 2)

  const restored = await listMatches()
  const byId = new Map(restored.map((m) => [m.id, m]))
  check('el partido completo vuelve idéntico', canon(byId.get(full.id)) === canon(full))
  check('el partido sin opcionales vuelve idéntico', canon(byId.get(bare.id)) === canon(bare))
  eq('y sus huecos siguen siendo undefined, no null', byId.get(bare.id)?.level, undefined)

  const settings = await readSettings(target)
  eq('se restauran las preferencias', settings.musicVolume, 0.6)
  eq('incluido el último nivel', settings.lastLevel, 'peak')
  eq('y el interruptor de rendimiento', settings.showPerf, true)
  eq('la calibración del móvil de destino se conserva', settings.audioOffsetMs, 210)
  eq('y su fecha de última copia también', settings.lastBackup, 555)

  const again = await exportAll(target)
  check(
    'exportar lo importado da los mismos partidos',
    JSON.stringify([...again.matches].sort((a, b) => a.playedAt - b.playedAt)) ===
      JSON.stringify([...backup.matches].sort((a, b) => a.playedAt - b.playedAt)),
  )

  /* --- Reemplazar y fusionar --------------------------------------------- */
  const extra = await addMatch({ goalsFor: 9, goalsAgainst: 9, goldenGoal: false, perfects: 1, goods: 1 }, 3000)
  await importBackup(target, json, 'merge')
  eq('fusionar no borra lo que ya había', (await listMatches()).length, 3)
  await importBackup(target, json, 'replace')
  const afterReplace = await listMatches()
  eq('reemplazar deja solo lo de la copia', afterReplace.length, 2)
  check('y quita el partido que no estaba en ella', !afterReplace.some((m) => m.id === extra.id))

  // Fusionar una copia con un partido cambiado actualiza ESE partido y solo ese.
  const edited: BackupFile = { ...backup, matches: backup.matches.map((m) => (m.id === full.id ? { ...m, goalsFor: 8 } : m)) }
  await importBackup(target, JSON.stringify(edited), 'merge')
  const merged = new Map((await listMatches()).map((m) => [m.id, m]))
  eq('fusionar actualiza el partido que cambió', merged.get(full.id)?.goalsFor, 8)
  eq('sin tocar el otro', merged.get(bare.id)?.goalsFor, 0)

  /* --- Valores desconocidos --------------------------------------------- */
  const odd = await freshDbAsCurrent()
  const weird = {
    ...backup,
    matches: [{ ...backup.matches[0], id: 'raro', level: 'after-hours' }],
    settings: { ...backup.settings, lastLevel: 'after-hours' },
  }
  await importBackup(odd, JSON.stringify(weird))
  const [oddMatch] = await listMatches()
  eq('un nivel desconocido en la copia entra como «sin nivel»', oddMatch?.level, undefined)
  eq('y el resto del partido entra igual', oddMatch?.goalsFor, backup.matches[0].goalsFor)
  eq('un último nivel desconocido no se cuela en los ajustes', (await readSettings(odd)).lastLevel, undefined)

  /* --- Volumen ----------------------------------------------------------- */
  const big = await freshDb()
  const many: MatchRecord[] = Array.from({ length: 1500 }, (_, i) => ({
    id: `m-${i}`,
    playedAt: i,
    goalsFor: i % 7,
    goalsAgainst: i % 5,
    goldenGoal: i % 9 === 0,
    perfects: i % 13,
    goods: i % 11,
  }))
  await importBackup(big, JSON.stringify({ ...backup, matches: many }))
  const exported = await exportAll(big)
  eq('1500 partidos entran y salen', exported.matches.length, 1500)
  const sample = exported.matches.find((m) => m.id === 'm-1234')
  check('sin mezclarse entre sí', sample?.goalsFor === 1234 % 7 && sample?.goalsAgainst === 1234 % 5 && sample?.perfects === 1234 % 13)

  /* --- Lo que hay que rechazar ------------------------------------------- */
  const guarded = await freshDbAsCurrent()
  await addMatch({ goalsFor: 1, goalsAgainst: 0, goldenGoal: false, perfects: 0, goods: 0 }, 1)
  await rejects('rechaza lo que no es JSON', () => importBackup(guarded, 'esto no es json'), 'JSON válido')
  await rejects('rechaza un JSON que es null', () => importBackup(guarded, 'null'), 'no parece una copia')
  await rejects('rechaza la copia de otra app', () => importBackup(guarded, JSON.stringify({ ...backup, app: 'ludok-time' })), 'no parece una copia')
  await rejects('rechaza una copia sin partidos', () => importBackup(guarded, JSON.stringify({ app: 'ludok-kick', schemaVersion: 1 })), 'no parece una copia')
  await rejects(
    'rechaza una copia de una versión más nueva',
    () => importBackup(guarded, JSON.stringify({ ...backup, schemaVersion: SCHEMA_VERSION + 1 })),
    'más nueva',
  )
  eq('y ningún rechazo toca lo que había', (await listMatches()).length, 1)

  // Una copia con un partido imposible de guardar no puede dejar la base a medias.
  const broken = { ...backup, matches: [backup.matches[0], { id: 'roto' }] }
  let failed = false
  try {
    await importBackup(guarded, JSON.stringify(broken))
  } catch {
    failed = true
  }
  check('una copia con un partido roto falla entera', failed)
  eq('y deja la base como estaba', (await listMatches()).length, 1)

  finish('datos')
}

main()
