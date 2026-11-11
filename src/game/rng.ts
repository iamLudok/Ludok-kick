/**
 * Azar reproducible (mulberry32). El juego no usa Math.random: con una semilla
 * guardada en el estado, los mismos inputs dan siempre el mismo partido, que
 * es lo que permite probarlo (y, algún día, jugarlo en red).
 */
export type Seeded = { seed: number }

/** Número entre 0 y 1; avanza la semilla de `holder`. */
export function nextRandom(holder: Seeded): number {
  'worklet'
  holder.seed = (holder.seed + 0x6d2b79f5) | 0
  let t = Math.imul(holder.seed ^ (holder.seed >>> 15), 1 | holder.seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
