// Monedas y mejoras. Sin imports nativos: pide la base a `dbRef`, así se
// prueba en Node con el mismo código.
import { UPGRADE, upgradeCost, type Stat, type UpgradeLevels } from '../game/upgrades'
import type { Settings } from '../types'
import { getSettings, updateSettings } from './settings'

/** Columna de ajustes de cada mejora. */
const FIELD: Record<Stat, 'upSpeed' | 'upKick' | 'upJump' | 'upDash' | 'upPower'> = {
  speed: 'upSpeed',
  kick: 'upKick',
  jump: 'upJump',
  dash: 'upDash',
  power: 'upPower',
}

export function levelsOf(s: Settings): UpgradeLevels {
  return { speed: s.upSpeed, kick: s.upKick, jump: s.upJump, dash: s.upDash, power: s.upPower }
}

/**
 * Las monedas de un partido. Ganar paga bastante más que perder, pero perder
 * también da algo (si no, quien se atasca contra un rival no puede mejorar
 * para ganarle). Los goles, los PERFECT y los logros nuevos suman, y los
 * rivales de arriba de la escalera pagan más.
 */
export function coinsFor(r: { goalsFor: number; goalsAgainst: number; perfects: number; rung: number; newBadges: number }): number {
  const win = r.goalsFor > r.goalsAgainst
  return (win ? 60 + r.rung * 8 : 20) + r.goalsFor * 10 + r.perfects * 3 + r.newBadges * 40
}

export async function addCoins(amount: number): Promise<void> {
  const s = await getSettings()
  await updateSettings({ coins: s.coins + Math.max(0, Math.round(amount)) })
}

/**
 * Compra el siguiente nivel de una mejora. Devuelve por qué no se pudo, o null
 * si se compró.
 */
export async function buyUpgrade(stat: Stat): Promise<'max' | 'coins' | null> {
  const s = await getSettings()
  const level = s[FIELD[stat]]
  if (level >= UPGRADE.MAX_LEVEL) return 'max'
  const cost = upgradeCost(level)
  if (s.coins < cost) return 'coins'
  await updateSettings({ coins: s.coins - cost, [FIELD[stat]]: level + 1 })
  return null
}
