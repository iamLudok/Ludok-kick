/** Las reglas de ajustes e historial, una por una, con el código real. */
import { BEAT } from '../src/game/constants'
import { UPGRADE, statsFor, upgradeCost } from '../src/game/upgrades'
import { addCoins, buyUpgrade, levelsOf } from '../src/lib/progress'
import { addMatch, listMatches, tally } from '../src/lib/matches'
import {
  DEFAULT_SETTINGS,
  clampOffsetMs,
  clearAudioOffset,
  effectiveOffsetMs,
  ensureSettings,
  getSettings,
  saveAudioOffset,
  updateSettings,
} from '../src/lib/settings'
import { check, eq, finish, freshDbAsCurrent, rejects } from './harness'

async function main() {
  /* --- Ajustes ----------------------------------------------------------- */
  await freshDbAsCurrent()
  const first = await getSettings()
  eq('sin nada guardado se leen los ajustes por defecto', first.musicVolume, DEFAULT_SETTINGS.musicVolume)
  eq('y sin calibrar', first.audioOffsetMs, undefined)

  await ensureSettings()
  await updateSettings({ musicVolume: 0.4 })
  await ensureSettings()
  eq('asegurar los ajustes dos veces no pisa lo guardado', (await getSettings()).musicVolume, 0.4)

  await updateSettings({ lastLevel: 'warmup' })
  const s = await getSettings()
  check('actualizar un campo no toca los demás', s.musicVolume === 0.4 && s.lastLevel === 'warmup')

  /* --- Calibración ------------------------------------------------------- */
  await saveAudioOffset(123.6)
  eq('el desfase se guarda en milisegundos enteros', (await getSettings()).audioOffsetMs, 124)
  await saveAudioOffset(0)
  eq('un desfase de 0 es una calibración válida, no «sin calibrar»', (await getSettings()).audioOffsetMs, 0)
  await saveAudioOffset(99999)
  eq('un desfase absurdo se recorta al máximo', (await getSettings()).audioOffsetMs, BEAT.MAX_OFFSET_MS)
  eq('también por abajo', clampOffsetMs(-99999), -BEAT.MAX_OFFSET_MS)
  await clearAudioOffset()
  eq('se puede volver a «sin calibrar»', (await getSettings()).audioOffsetMs, undefined)
  eq('y eso no borra el resto', (await getSettings()).musicVolume, 0.4)

  const uncalibrated = { ...DEFAULT_SETTINGS }
  eq('calibrado: manda la medida del jugador', effectiveOffsetMs({ ...uncalibrated, audioOffsetMs: 150 }, 30), 150)
  eq('calibrado a 0: sigue mandando', effectiveOffsetMs({ ...uncalibrated, audioOffsetMs: 0 }, 30), 0)
  eq('sin calibrar: lo que diga el móvil', effectiveOffsetMs(uncalibrated, 31.4), 31)
  eq('sin calibrar y sin dato del móvil: el valor típico', effectiveOffsetMs(uncalibrated, 0), BEAT.DEFAULT_OFFSET_MS)

  /* --- Monedas y mejoras ------------------------------------------------- */
  await freshDbAsCurrent()
  await ensureSettings()
  eq('se empieza sin monedas', (await getSettings()).coins, 0)
  eq('sin monedas no se compra', await buyUpgrade('speed'), 'coins')
  await addCoins(upgradeCost(0) + upgradeCost(1) - 1)
  eq('con las justas, sí', await buyUpgrade('speed'), null)
  const after = await getSettings()
  check('subir un nivel cuesta lo que dice', after.upSpeed === 1 && after.coins === upgradeCost(1) - 1, `nivel ${after.upSpeed}, quedan ${after.coins}`)
  eq('y el siguiente ya no llega por una moneda', await buyUpgrade('speed'), 'coins')
  eq('las demás mejoras no se tocan', after.upKick + after.upJump + after.upDash + after.upPower, 0)
  await updateSettings({ upJump: UPGRADE.MAX_LEVEL, coins: 99999 })
  eq('al máximo no se puede subir más', await buyUpgrade('jump'), 'max')
  eq('y no cobra', (await getSettings()).coins, 99999)
  await addCoins(-50)
  eq('no se pueden restar monedas por la puerta de atrás', (await getSettings()).coins, 99999)
  const st = statsFor(levelsOf(await getSettings()), 'scratch')
  check('las mejoras se notan en las estadísticas', st.jump > 1 && st.speed > 1 && st.kick === 1, JSON.stringify(st))

  /* --- Historial --------------------------------------------------------- */
  await freshDbAsCurrent()
  eq('el historial empieza vacío', (await listMatches()).length, 0)
  const base = { goldenGoal: false, perfects: 0, goods: 0 }
  await addMatch({ ...base, goalsFor: 2, goalsAgainst: 1 }, 100)
  await addMatch({ ...base, goalsFor: 0, goalsAgainst: 3 }, 300)
  await addMatch({ ...base, goalsFor: 1, goalsAgainst: 1 }, 200)
  const list = await listMatches()
  check('se lista del más reciente al más antiguo', list.map((m) => m.playedAt).join() === '300,200,100')
  check('cada partido tiene un id distinto', new Set(list.map((m) => m.id)).size === 3)
  eq('el límite se respeta', (await listMatches(2)).length, 2)

  const t = tally(list)
  check('el balance cuenta ganados, empatados y perdidos', t.played === 3 && t.won === 1 && t.drawn === 1 && t.lost === 1)

  await rejects('no se guarda un marcador negativo', () => addMatch({ ...base, goalsFor: -1, goalsAgainst: 0 }), 'negativo')
  eq('y el intento no deja nada escrito', (await listMatches()).length, 3)

  finish('reglas')
}

main()
