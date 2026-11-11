/**
 * Las bases, escritas como rejillas de 16 semicorcheas por compás. Cada
 * escenario tendrá la suya; de momento solo existe la del prototipo.
 *
 * El bombo cae siempre en las cuatro negras (pasos 0, 4, 8 y 12): esos son los
 * beats contra los que se juzga el remate, y tienen que oírse sin lugar a dudas.
 */

/** Frecuencia de una nota a `semitones` de distancia de La 1 (55 Hz). */
export function note(semitones: number): number {
  return 55 * Math.pow(2, semitones / 12)
}

export type Pattern = {
  /** Pasos (0–15) en los que suena cada instrumento. */
  kick: number[]
  hat: number[]
  hat16: number[]
  openHat: number[]
  clap: number[]
  /** Bajo: paso → semitonos sobre la tónica del compás. */
  bass: Record<number, number>
  /** Pasos en los que entra el acorde. */
  stab: number[]
  /** Percusión propia del escenario y su timbre. */
  perc: number[]
  percVoice: 'metal' | 'wood'
  /** Timbre del bajo: sierra (más áspero) o cuadrada (más hueco). */
  bassWave: 'sawtooth' | 'square'
  /** Timbre de los acordes; por defecto, sierra. */
  stabWave?: 'sawtooth' | 'square' | 'triangle'
  /**
   * Arpegio: en qué pasos suena una nota y cuáles, en semitonos sobre la
   * tónica del acorde (se van recorriendo en orden).
   */
  arp?: { steps: number[]; notes: number[]; wave: 'triangle' | 'square' | 'sawtooth' }
  /** Un acorde por compás, en bucle: tónica del bajo y notas del acorde (semitonos desde La 1). */
  chords: { root: number; notes: number[] }[]
  /**
   * A partir de qué compás entra cada capa. La canción se va montando sola:
   * empieza con bombo y plato, y va sumando.
   */
  enter: { clap: number; bass: number; hat16: number; stab: number; perc: number; arp?: number }
}

export const PROTOTYPE_PATTERN: Pattern = {
  kick: [0, 4, 8, 12],
  hat: [2, 6, 10, 14],
  hat16: [1, 3, 5, 7, 9, 11, 13, 15],
  openHat: [14],
  clap: [4, 12],
  // Bajo «rodante»: calla donde pega el bombo y rellena las otras tres semicorcheas.
  bass: { 1: 0, 2: 0, 3: 12, 5: 0, 6: 0, 7: 12, 9: 0, 10: 0, 11: 12, 13: 0, 14: 0, 15: 10 },
  stab: [3, 10],
  perc: [],
  percVoice: 'metal',
  bassWave: 'sawtooth',
  chords: [
    { root: 0, notes: [24, 27, 31] }, // La menor
    { root: 0, notes: [24, 27, 31] },
    { root: -4, notes: [20, 24, 27] }, // Fa
    { root: -2, notes: [22, 26, 29] }, // Sol
  ],
  enter: { clap: 2, bass: 4, hat16: 8, stab: 12, perc: 0 },
}

/** Solo bombo y un plato a contratiempo: para calibrar, nada que distraiga. */
export const METRONOME_PATTERN: Pattern = {
  kick: [0, 4, 8, 12],
  hat: [],
  hat16: [],
  openHat: [],
  clap: [],
  bass: {},
  stab: [],
  perc: [],
  percVoice: 'metal',
  bassWave: 'sawtooth',
  chords: [{ root: 0, notes: [] }],
  enter: { clap: 0, bass: 0, hat16: 0, stab: 0, perc: 0 },
}
