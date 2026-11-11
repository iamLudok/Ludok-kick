/**
 * Modelo de lo que la app guarda. El juego en sí (el estado de un partido en
 * curso) no está aquí: eso vive en `src/game/types.ts` y no se guarda nunca.
 *
 * Los campos ausentes son `undefined`, nunca `null`: así `JSON.stringify` los
 * quita y el fichero de copia tiene siempre la misma forma.
 */

/** Niveles de la IA: Warm-up, Peak Time y Closing. */
export type Level = 'warmup' | 'peak' | 'closing'

export const LEVELS: Level[] = ['warmup', 'peak', 'closing']

/** Para lo que llega de fuera (la ruta, una copia): ¿es un nivel de verdad? */
export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as string[]).includes(value)
}

/** Un partido terminado. */
export interface MatchRecord {
  id: string
  playedAt: number
  goalsFor: number
  goalsAgainst: number
  /** Se decidió en gol de oro. */
  goldenGoal: boolean
  /** Remates PERFECT y GOOD del jugador. */
  perfects: number
  goods: number
  level?: Level
  /** Identificadores del DJ propio, del rival y del escenario. */
  dj?: string
  rivalDj?: string
  stage?: string
}

export interface Settings {
  id: 'app'
  /**
   * Desfase de audio calibrado, en milisegundos: lo que tarda en oírse un
   * sonido en ESTE móvil con ESTOS auriculares. Ausente = sin calibrar.
   */
  audioOffsetMs?: number
  /** Volúmenes de 0 a 1. */
  musicVolume: number
  sfxVolume: number
  /** Lo último que se eligió, para proponerlo la próxima vez. */
  lastDj?: string
  lastStage?: string
  lastLevel?: Level
  /** Enseñar fps y milisegundos por frame durante el partido. Ausente = no. */
  showPerf?: boolean
  /** Fecha de la última copia exportada; 0 si nunca. */
  lastBackup: number
  schemaVersion: number
}

export interface BackupFile {
  app: 'ludok-kick'
  schemaVersion: number
  exportedAt: number
  matches: MatchRecord[]
  settings: Settings
}
