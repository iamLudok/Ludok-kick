/**
 * Los DJs. Son homenajes: caricaturas con nombres guiño que recuerdan a DJs
 * conocidos, sin usar su nombre ni su imagen reales. Así el APK se puede
 * compartir sin problemas.
 *
 * Cada uno pone su música (su género, a su tempo), tiene un pequeño matiz de
 * juego y su poder propio. Todo lo que distingue a un DJ está aquí: para
 * cambiar un nombre, un color o un número no hay que tocar nada más.
 */
import type { PlayerStats } from '../game/types'
import type { GenreId } from './genres'

export type DjId =
  | 'ludok'
  | 'karl'
  | 'dabid'
  | 'daft'
  | 'deadmouse'
  | 'marsmelou'
  | 'carlota'
  | 'ameli'
  | 'arnim'
  | 'ritxie'
  | 'solomoon'
  | 'klaptone'
  | 'boris'
  | 'ihm'

export type DjLook = {
  /** Camiseta: el color que identifica al DJ en el campo. */
  jersey: string
  skin: string
  hair: string
  /** Peinado. Es lo que hace reconocible la silueta. */
  hair_style: 'bald' | 'short' | 'slick' | 'long' | 'bob' | 'bun' | 'hood'
  /** Lo que tapa la cara, si algo. Con casco, el peinado no se ve. */
  mask: 'none' | 'robot' | 'mouse' | 'marsh' | 'beak' | 'jester' | 'buff'
  glasses: 'none' | 'round' | 'rect'
  /** Sonrisa de oreja a oreja en vez de boca seria. */
  grin: boolean
  beard: boolean
  /** Color de detalle: la máscara, el casco, la capucha… */
  accent: string
}

export type Dj = {
  id: DjId
  name: string
  /** A quién recuerda, para la pantalla de selección. */
  tribute: string
  genre: GenreId
  /** La ventaja en una frase; vacío si no tiene. */
  perk: string
  stats: PlayerStats
  look: DjLook
}

const BASE = { speed: 1, jump: 1, kick: 1, timing: 1 }

const look = (l: Partial<DjLook> & Pick<DjLook, 'jersey'>): DjLook => ({
  skin: '#f2c8a0',
  hair: '#2a1d16',
  hair_style: 'short',
  mask: 'none',
  glasses: 'none',
  grin: false,
  beard: false,
  accent: l.jersey,
  ...l,
})

export const DJS: Dj[] = [
  {
    id: 'ludok',
    name: 'DJ Ludok',
    tribute: 'La mascota de la casa',
    genre: 'house',
    perk: '',
    stats: { ...BASE, power: 'scratch' },
    look: look({ jersey: '#7A45C4', hair_style: 'hood', accent: '#7A45C4', grin: true }),
  },
  {
    id: 'karl',
    name: 'Karl Box',
    tribute: 'Carl Cox',
    genre: 'techno',
    perk: 'Tiro más fuerte',
    stats: { ...BASE, kick: 1.12, power: 'lowpass' },
    look: look({ jersey: '#e8443a', skin: '#6b4330', hair_style: 'bald', grin: true }),
  },
  {
    id: 'dabid',
    name: 'Dabid Getta',
    tribute: 'David Guetta',
    genre: 'edm',
    perk: 'Salta más alto',
    stats: { ...BASE, jump: 1.08, power: 'loop' },
    look: look({ jersey: '#1d1d24', hair: '#f0d27a', hair_style: 'long', grin: true }),
  },
  {
    id: 'daft',
    name: 'Daft Funk',
    tribute: 'Daft Punk',
    genre: 'french',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.25, power: 'cue' },
    look: look({ jersey: '#2b2b33', mask: 'robot', accent: '#d9b44a' }),
  },
  {
    id: 'deadmouse',
    name: 'Deadmouse',
    tribute: 'deadmau5',
    genre: 'progressive',
    perk: 'Corre más rápido',
    stats: { ...BASE, speed: 1.06, power: 'scratch' },
    look: look({ jersey: '#e8434f', mask: 'mouse', accent: '#e8434f' }),
  },
  {
    id: 'marsmelou',
    name: 'Marsmelou',
    tribute: 'Marshmello',
    genre: 'bounce',
    perk: 'Salta más alto',
    stats: { ...BASE, jump: 1.08, power: 'cue' },
    look: look({ jersey: '#f3f1ec', mask: 'marsh', accent: '#ffffff' }),
  },
  {
    id: 'carlota',
    name: 'Carlota de Whitte',
    tribute: 'Charlotte de Witte',
    genre: 'dark',
    perk: 'Tiro más fuerte',
    stats: { ...BASE, kick: 1.12, power: 'loop' },
    look: look({ jersey: '#141218', skin: '#f6d4bc', hair: '#120e10', hair_style: 'long' }),
  },
  {
    id: 'ameli',
    name: 'Ameli Lenz',
    tribute: 'Amelie Lens',
    genre: 'hard',
    perk: 'Corre más rápido',
    stats: { ...BASE, speed: 1.06, power: 'lowpass' },
    look: look({ jersey: '#3a3f4a', skin: '#f6d4bc', hair: '#4a3022', hair_style: 'bob' }),
  },
  {
    id: 'arnim',
    name: 'Arnim Ban Buren',
    tribute: 'Armin van Buuren',
    genre: 'trance',
    perk: 'Salta más alto',
    stats: { ...BASE, jump: 1.08, power: 'scratch' },
    look: look({ jersey: '#3f7fff', hair: '#6b4a32', hair_style: 'short', grin: true }),
  },
  {
    id: 'ritxie',
    name: 'Ritxie Hautin',
    tribute: 'Richie Hawtin',
    genre: 'minimal',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.25, power: 'loop' },
    look: look({ jersey: '#e8e8ea', hair: '#1a1a1e', hair_style: 'slick', glasses: 'rect' }),
  },
  {
    id: 'solomoon',
    name: 'Solomoon',
    tribute: 'Solomun',
    genre: 'melodic',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.25, power: 'lowpass' },
    look: look({ jersey: '#2f6b5a', skin: '#e2b48e', hair: '#2a1d16', hair_style: 'bun', beard: true }),
  },
  {
    id: 'klaptone',
    name: 'Klaptone',
    tribute: 'Claptone',
    genre: 'deep',
    perk: 'Corre más rápido',
    stats: { ...BASE, speed: 1.06, power: 'cue' },
    look: look({ jersey: '#1d1d24', hair: '#121016', hair_style: 'short', mask: 'beak', accent: '#e0b84a' }),
  },
  {
    id: 'boris',
    name: 'Boris Brejtxa',
    tribute: 'Boris Brejcha',
    genre: 'hightech',
    perk: 'Ventana PERFECT más amplia y tiro algo más fuerte',
    stats: { ...BASE, timing: 1.2, kick: 1.05, power: 'scratch' },
    look: look({ jersey: '#1d1d24', mask: 'jester', accent: '#d8364a' }),
  },
  {
    id: 'ihm',
    name: 'I Hate Modems',
    tribute: 'I Hate Models',
    genre: 'industrial',
    perk: 'Tiro más fuerte y corre algo más',
    stats: { ...BASE, kick: 1.12, speed: 1.04, power: 'lowpass' },
    look: look({ jersey: '#0e0e12', hair_style: 'hood', mask: 'buff', accent: '#26262e' }),
  },
]

/** El DJ con el que se empieza; los demás se desbloquean con misiones. */
export const STARTER: DjId = 'ludok'

export function getDj(id: string | undefined): Dj {
  return DJS.find((d) => d.id === id) ?? DJS[0]
}

export function isDjId(value: unknown): value is DjId {
  return typeof value === 'string' && DJS.some((d) => d.id === value)
}

/** Un rival al azar que no sea tu mismo DJ. Puede estar bloqueado: así se le conoce antes de ganarlo. */
export function pickRival(mine: DjId, random: () => number = Math.random): DjId {
  const others = DJS.filter((d) => d.id !== mine)
  return others[Math.floor(random() * others.length)].id
}
