/**
 * Los DJs. Son homenajes: caricaturas con nombres guiño que recuerdan a DJs
 * conocidos. A propósito no se nombra a quién recuerdan (ni aquí en la
 * interfaz ni en ninguna parte): el guiño se entiende solo, y así el APK se
 * puede compartir sin usar el nombre de nadie.
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
  hairColor: string
  /** Peinado. Es lo que hace reconocible la silueta. */
  hair: 'bald' | 'buzz' | 'short' | 'spiky' | 'slick' | 'long' | 'longCenter' | 'bob' | 'bun' | 'hood'
  /** Lo que tapa la cara, si algo. Con casco, cubo o cabeza de ratón, el peinado no se ve. */
  mask: 'none' | 'robot' | 'mouse' | 'marsh' | 'beak' | 'jester' | 'buff'
  glasses: 'none' | 'round' | 'rect'
  mouth: 'grin' | 'smile' | 'neutral' | 'open'
  brows: 'frown' | 'flat' | 'raised'
  facialHair: 'none' | 'stubble' | 'beard'
  headphones: boolean
  /** Color de detalle: la capucha, el casco, el buff, los auriculares… */
  accent: string
}

export type Dj = {
  id: DjId
  name: string
  genre: GenreId
  /** La ventaja en una frase; vacío si no tiene. */
  perk: string
  stats: PlayerStats
  look: DjLook
}

const BASE = { speed: 1, jump: 1, kick: 1, timing: 1 }

const look = (l: Partial<DjLook> & Pick<DjLook, 'jersey'>): DjLook => ({
  skin: '#f2c8a0',
  hairColor: '#2a1d16',
  hair: 'short',
  mask: 'none',
  glasses: 'none',
  mouth: 'neutral',
  brows: 'flat',
  facialHair: 'none',
  headphones: false,
  accent: '#2a2a32',
  ...l,
})

export const DJS: Dj[] = [
  {
    id: 'ludok',
    name: 'DJ Ludok',
    genre: 'house',
    perk: 'Tiro algo más fuerte',
    stats: { ...BASE, kick: 1.06, power: 'scratch' },
    look: look({ jersey: '#7A45C4', hair: 'hood', accent: '#7A45C4', mouth: 'grin', brows: 'raised' }),
  },
  {
    id: 'karl',
    name: 'Karl Box',
    genre: 'techno',
    perk: 'Tiro más fuerte',
    stats: { ...BASE, kick: 1.12, power: 'stomp' },
    look: look({ jersey: '#e8443a', skin: '#6b4330', hair: 'bald', mouth: 'grin', brows: 'raised', headphones: true, accent: '#2a2a32' }),
  },
  {
    id: 'dabid',
    name: 'Dabid Getta',
    genre: 'edm',
    perk: 'Salta más alto',
    stats: { ...BASE, jump: 1.08, power: 'hype' },
    look: look({ jersey: '#1d1d24', hairColor: '#e9c46a', hair: 'long', facialHair: 'stubble', mouth: 'smile', brows: 'raised' }),
  },
  {
    id: 'daft',
    name: 'Daft Funk',
    genre: 'french',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.25, power: 'robot' },
    look: look({ jersey: '#2b2b33', mask: 'robot', accent: '#d9b44a' }),
  },
  {
    id: 'deadmouse',
    name: 'Deadmouse',
    genre: 'progressive',
    perk: 'Corre más rápido',
    stats: { ...BASE, speed: 1.06, power: 'bighead' },
    look: look({ jersey: '#e8434f', mask: 'mouse', accent: '#e8434f' }),
  },
  {
    id: 'marsmelou',
    name: 'Marsmelou',
    genre: 'bounce',
    perk: 'Salta más alto',
    stats: { ...BASE, jump: 1.08, power: 'cloud' },
    look: look({ jersey: '#f3f1ec', mask: 'marsh', accent: '#ffffff' }),
  },
  {
    id: 'carlota',
    name: 'Carlota de Whitte',
    genre: 'dark',
    perk: 'Tiro más fuerte',
    stats: { ...BASE, kick: 1.12, power: 'wall' },
    look: look({ jersey: '#141218', skin: '#f6d4bc', hairColor: '#141014', hair: 'longCenter', brows: 'frown' }),
  },
  {
    id: 'ameli',
    name: 'Ameli Lenz',
    genre: 'hard',
    perk: 'Corre más rápido',
    stats: { ...BASE, speed: 1.06, power: 'laser' },
    look: look({ jersey: '#3a3f4a', skin: '#f6d4bc', hairColor: '#4a3022', hair: 'bob', brows: 'flat', mouth: 'smile' }),
  },
  {
    id: 'arnim',
    name: 'Arnim Ban Buren',
    genre: 'trance',
    perk: 'Salta más alto',
    stats: { ...BASE, jump: 1.08, power: 'lowpass' },
    look: look({ jersey: '#3f7fff', hairColor: '#8a6440', hair: 'spiky', mouth: 'grin', brows: 'raised' }),
  },
  {
    id: 'ritxie',
    name: 'Ritxie Hautin',
    genre: 'minimal',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.25, power: 'loop' },
    look: look({ jersey: '#e8e8ea', hairColor: '#1a1a1e', hair: 'slick', glasses: 'rect', brows: 'flat' }),
  },
  {
    id: 'solomoon',
    name: 'Solomoon',
    genre: 'melodic',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.25, power: 'moon' },
    look: look({ jersey: '#2f6b5a', skin: '#e2b48e', hairColor: '#2a1d16', hair: 'bun', facialHair: 'beard', brows: 'frown' }),
  },
  {
    id: 'klaptone',
    name: 'Klaptone',
    genre: 'deep',
    perk: 'Corre más rápido',
    stats: { ...BASE, speed: 1.06, power: 'wings' },
    look: look({ jersey: '#1d1d24', hairColor: '#121016', hair: 'slick', mask: 'beak', accent: '#e0b84a' }),
  },
  {
    id: 'boris',
    name: 'Boris Brejtxa',
    genre: 'hightech',
    perk: 'Ventana PERFECT más amplia',
    stats: { ...BASE, timing: 1.2, power: 'jester' },
    look: look({ jersey: '#1d1d24', mask: 'jester', accent: '#d8364a' }),
  },
  {
    id: 'ihm',
    name: 'I Hate Modems',
    genre: 'industrial',
    perk: 'Tiro más fuerte y corre algo más',
    stats: { ...BASE, kick: 1.12, speed: 1.04, power: 'blackout' },
    look: look({ jersey: '#0e0e12', hair: 'hood', mask: 'buff', accent: '#26262e', brows: 'frown' }),
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
