/**
 * Las mejoras: tus cinco estadísticas (como en Head Soccer), que se compran
 * con las monedas que se ganan jugando. Valen para cualquier DJ: los DJs se
 * diferencian por su habilidad, no por los números.
 *
 * El rival también tiene sus niveles: los de su escalón de la escalera (ver
 * `src/content/ladder.ts`). Así el reto sube aunque tú te vayas mejorando.
 */
import type { PlayerStats, PowerKind } from './types'

export type Stat = 'speed' | 'kick' | 'jump' | 'dash' | 'power'

export const STATS: Stat[] = ['speed', 'kick', 'jump', 'dash', 'power']

export type UpgradeLevels = Record<Stat, number>

export const UPGRADE = {
  MAX_LEVEL: 10,
  /**
   * Lo que suma cada nivel, en fracción de la estadística base. A nivel
   * máximo: un 20 % más rápido, un 25 % más de tiro, un 15 % más de salto,
   * un 30 % más de dash y la barra un 40 % más rápida. Más que eso rompía la
   * física: un salto un 30 % más alto ya tocaba el techo.
   */
  PER_LEVEL: { speed: 0.02, kick: 0.025, jump: 0.015, dash: 0.03, power: 0.04 } as Record<Stat, number>,
  /** Precio del nivel n (el que se compra): BASE + STEP × n. */
  COST_BASE: 100,
  COST_STEP: 60,
}

export const NO_UPGRADES: UpgradeLevels = { speed: 0, kick: 0, jump: 0, dash: 0, power: 0 }

export function upgradeCost(currentLevel: number): number {
  return UPGRADE.COST_BASE + UPGRADE.COST_STEP * currentLevel
}

/** Lo que valen unos niveles en la física, con la habilidad del DJ que se juega. */
export function statsFor(levels: UpgradeLevels, power: PowerKind | null): PlayerStats {
  const k = (s: Stat) => 1 + UPGRADE.PER_LEVEL[s] * Math.max(0, Math.min(UPGRADE.MAX_LEVEL, levels[s]))
  return { speed: k('speed'), kick: k('kick'), jump: k('jump'), dash: k('dash'), charge: k('power'), timing: 1, power }
}

/** Todos los niveles iguales: así se hace al rival de un escalón. */
export function evenLevels(level: number): UpgradeLevels {
  return { speed: level, kick: level, jump: level, dash: level, power: level }
}
