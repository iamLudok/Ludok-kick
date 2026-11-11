/**
 * Los géneros: la música que pone cada DJ, con su tempo fijo. Son rejillas de
 * 16 pasos por compás (ver `src/audio/patterns.ts`).
 *
 * El bombo va SIEMPRE en las cuatro negras (0, 4, 8, 12): son los beats contra
 * los que se juzga el remate. `verify/characters.ts` comprueba que ningún
 * género lo cambie. Los tempos van de 122 a 145: por debajo el partido se
 * hace lento y por encima el beat ya no se puede seguir rematando.
 *
 * Las notas van en semitonos desde La 1 (55 Hz): 0 es La, 3 Do, 5 Re, 7 Mi…
 */
import type { Pattern } from '../audio/patterns'

export type GenreId =
  | 'house'
  | 'techno'
  | 'french'
  | 'progressive'
  | 'proghouse'
  | 'bounce'
  | 'minimal'
  | 'melodic'
  | 'melotechno'
  | 'deep'
  | 'hightech'
  | 'industrial'

export type Genre = {
  id: GenreId
  name: string
  bpm: number
  pattern: Pattern
}

const FOUR = [0, 4, 8, 12]
const OFF = [2, 6, 10, 14]
const SIXTEENTHS = [1, 3, 5, 7, 9, 11, 13, 15]
const AMINOR = [
  { root: 0, notes: [24, 27, 31] },
  { root: 0, notes: [24, 27, 31] },
  { root: -4, notes: [20, 24, 27] },
  { root: -2, notes: [22, 26, 29] },
]

export const GENRES: Genre[] = [
  {
    id: 'house',
    name: 'House',
    bpm: 124,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [14],
      clap: [4, 12],
      bass: {
        1: 0,
        2: 0,
        3: 12,
        5: 0,
        6: 0,
        7: 12,
        9: 0,
        10: 0,
        11: 12,
        13: 0,
        14: 0,
        15: 10,
      },
      stab: [3, 10],
      perc: [],
      percVoice: 'wood',
      bassWave: 'sawtooth',
      chords: AMINOR,
      enter: { clap: 2, bass: 4, hat16: 8, stab: 12, perc: 99 },
    },
  },
  {
    id: 'techno',
    name: 'Techno',
    bpm: 130,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [],
      clap: [12],
      bass: { 2: 0, 3: 0, 6: 0, 7: 0, 10: 0, 11: 0, 14: 0, 15: 1 },
      stab: [10],
      perc: [7, 15],
      percVoice: 'metal',
      bassWave: 'sawtooth',
      chords: [
        { root: -5, notes: [19, 22, 26] },
        { root: -5, notes: [19, 22, 26] },
        { root: -7, notes: [17, 20, 24] },
        { root: -4, notes: [20, 23, 27] },
      ],
      enter: { perc: 2, bass: 4, clap: 6, hat16: 8, stab: 12 },
    },
  },
  {
    id: 'french',
    name: 'French house',
    bpm: 124,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [6, 14],
      clap: [4, 12],
      bass: { 0: 0, 3: 12, 6: 0, 7: 7, 10: 0, 11: 12, 14: 10 },
      stab: [0, 3, 6, 10, 13],
      perc: [],
      percVoice: 'wood',
      bassWave: 'square',
      stabWave: 'square',
      chords: [
        { root: 5, notes: [29, 33, 36, 40] },
        { root: 3, notes: [27, 31, 34, 38] },
        { root: 0, notes: [24, 28, 31, 35] },
        { root: 3, notes: [27, 31, 34, 38] },
      ],
      enter: { clap: 2, bass: 2, hat16: 4, stab: 4, perc: 99 },
    },
  },
  {
    id: 'progressive',
    name: 'Progressive',
    bpm: 128,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [],
      clap: [4, 12],
      bass: {
        1: 0,
        2: 0,
        3: 0,
        5: 0,
        6: 0,
        7: 0,
        9: 0,
        10: 0,
        11: 0,
        13: 0,
        14: 0,
        15: 0,
      },
      stab: [],
      perc: [],
      percVoice: 'metal',
      bassWave: 'sawtooth',
      chords: [
        { root: -3, notes: [] },
        { root: -3, notes: [] },
        { root: -7, notes: [] },
        { root: -5, notes: [] },
      ],
      arp: {
        steps: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
        notes: [12, 19, 15, 24, 19],
        wave: 'triangle',
      },
      enter: { clap: 4, bass: 2, hat16: 8, stab: 99, perc: 99, arp: 0 },
    },
  },
  {
    id: 'proghouse',
    name: 'Progressive house',
    bpm: 124,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [14],
      clap: [4, 12],
      bass: { 2: 0, 3: 12, 6: 0, 7: 12, 10: 0, 11: 12, 14: 0, 15: 7 },
      stab: [0, 6, 10],
      perc: [],
      percVoice: 'wood',
      bassWave: 'sawtooth',
      stabWave: 'triangle',
      chords: [
        { root: -4, notes: [20, 24, 27, 31] },
        { root: -2, notes: [22, 26, 29, 33] },
        { root: 3, notes: [27, 31, 34, 38] },
        { root: -2, notes: [22, 26, 29, 33] },
      ],
      arp: {
        steps: [0, 3, 6, 9, 12, 14],
        notes: [12, 19, 24, 19],
        wave: 'triangle',
      },
      enter: { clap: 2, bass: 2, hat16: 4, stab: 4, perc: 99, arp: 8 },
    },
  },
  {
    id: 'bounce',
    name: 'Future bounce',
    bpm: 128,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: [3, 7, 11, 15],
      openHat: [],
      clap: [4, 12],
      bass: { 0: 0, 7: 7, 10: 0, 15: 12 },
      stab: [0, 3, 6, 10],
      perc: [],
      percVoice: 'wood',
      bassWave: 'square',
      stabWave: 'square',
      chords: [
        { root: 3, notes: [27, 31, 34, 39] },
        { root: -2, notes: [22, 26, 29, 34] },
        { root: 0, notes: [24, 27, 31, 36] },
        { root: -4, notes: [20, 24, 27, 32] },
      ],
      enter: { clap: 1, bass: 2, hat16: 4, stab: 2, perc: 99 },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    bpm: 125,
    pattern: {
      kick: FOUR,
      hat: [2, 10],
      hat16: [5, 13],
      openHat: [],
      clap: [12],
      bass: { 3: 0, 9: 7 },
      stab: [],
      perc: [1, 6, 11, 14],
      percVoice: 'wood',
      bassWave: 'square',
      chords: [{ root: 0, notes: [] }],
      arp: { steps: [7, 15], notes: [12, 19], wave: 'square' },
      enter: { perc: 1, clap: 2, bass: 4, hat16: 6, stab: 99, arp: 8 },
    },
  },
  {
    id: 'melodic',
    name: 'Melodic house',
    bpm: 122,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [],
      clap: [12],
      bass: {
        1: 0,
        2: 0,
        3: 0,
        5: 0,
        6: 0,
        7: 0,
        9: 0,
        10: 0,
        11: 0,
        13: 0,
        14: 0,
        15: 0,
      },
      stab: [0, 8],
      perc: [],
      percVoice: 'wood',
      bassWave: 'sawtooth',
      stabWave: 'triangle',
      chords: [
        { root: 0, notes: [24, 27, 31] },
        { root: -2, notes: [22, 26, 29] },
        { root: -4, notes: [20, 24, 27] },
        { root: -2, notes: [22, 26, 29] },
      ],
      arp: {
        steps: [0, 3, 6, 8, 10, 13],
        notes: [12, 15, 19, 22, 24],
        wave: 'triangle',
      },
      enter: { clap: 4, bass: 2, hat16: 8, stab: 4, perc: 99, arp: 0 },
    },
  },
  {
    // Más oscuro que el melodic house: bajo rodando en semicorcheas, acordes
    // menores largos y un arpegio que sube.
    id: 'melotechno',
    name: 'Melodic techno',
    bpm: 124,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [],
      clap: [12],
      bass: {
        1: 0,
        2: 0,
        3: 0,
        5: 0,
        6: 0,
        7: 0,
        9: 0,
        10: 0,
        11: 0,
        13: 0,
        14: 0,
        15: 0,
      },
      stab: [0],
      perc: [7, 15],
      percVoice: 'metal',
      bassWave: 'sawtooth',
      stabWave: 'triangle',
      chords: [
        { root: -7, notes: [17, 20, 24] },
        { root: -7, notes: [17, 20, 24] },
        { root: -4, notes: [20, 24, 27] },
        { root: -9, notes: [15, 19, 22] },
      ],
      arp: {
        steps: [0, 2, 4, 6, 8, 10, 12, 14],
        notes: [17, 20, 24, 29, 24, 20],
        wave: 'sawtooth',
      },
      enter: { clap: 4, bass: 2, hat16: 8, stab: 4, perc: 6, arp: 0 },
    },
  },
  {
    id: 'deep',
    name: 'Deep house',
    bpm: 122,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: [3, 7, 11, 15],
      openHat: [14],
      clap: [4, 12],
      bass: { 3: 0, 6: 7, 7: 0, 10: 12, 11: 0, 14: 7 },
      stab: [2, 7, 10],
      perc: [],
      percVoice: 'wood',
      bassWave: 'square',
      stabWave: 'triangle',
      chords: [
        { root: -4, notes: [20, 24, 27, 31] },
        { root: -2, notes: [22, 26, 29, 33] },
        { root: 0, notes: [24, 27, 31, 34] },
        { root: -5, notes: [19, 22, 26, 29] },
      ],
      enter: { clap: 2, bass: 4, stab: 4, hat16: 8, perc: 99 },
    },
  },
  {
    id: 'hightech',
    name: 'High-tech minimal',
    bpm: 126,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: [],
      clap: [12],
      bass: { 2: 0, 3: 12, 7: 0, 10: 0, 11: 12, 15: 7 },
      stab: [],
      perc: [1, 5, 9, 14],
      percVoice: 'wood',
      bassWave: 'square',
      chords: [
        { root: 0, notes: [] },
        { root: 0, notes: [] },
        { root: 3, notes: [] },
        { root: -2, notes: [] },
      ],
      arp: {
        steps: [0, 2, 3, 6, 8, 9, 11, 14],
        notes: [12, 24, 19, 15, 22, 12],
        wave: 'square',
      },
      enter: { perc: 1, clap: 2, bass: 2, hat16: 4, stab: 99, arp: 4 },
    },
  },
  {
    id: 'industrial',
    name: 'Techno industrial',
    bpm: 145,
    pattern: {
      kick: FOUR,
      hat: OFF,
      hat16: SIXTEENTHS,
      openHat: OFF,
      clap: [4, 12],
      bass: { 2: 0, 3: 0, 6: 0, 7: 0, 10: 0, 11: 0, 14: 0, 15: 0 },
      stab: [3, 6, 11],
      perc: [1, 5, 7, 9, 13, 15],
      percVoice: 'metal',
      bassWave: 'sawtooth',
      chords: [
        { root: -7, notes: [17, 23] },
        { root: -7, notes: [17, 23] },
        { root: -6, notes: [18, 24] },
        { root: -8, notes: [16, 22] },
      ],
      enter: { perc: 1, clap: 2, bass: 2, hat16: 4, stab: 8 },
    },
  },
]

export function getGenre(id: GenreId): Genre {
  return GENRES.find((g) => g.id === id) ?? GENRES[0]
}
