/**
 * Los DJs. Personajes inventados (ninguno se basa en un artista real), con
 * nombres en euskera. Cada uno tiene un pequeño matiz de juego y su poder
 * propio; lo demás es aspecto.
 *
 * Todo lo que distingue a un DJ está aquí: para cambiar un nombre, un color o
 * un número, no hay que tocar nada más.
 */
import type { PlayerStats } from '../game/types'

export type DjId = 'burdina' | 'txiki' | 'ilargi' | 'etxe'

export type DjLook = {
  /** Camiseta y auriculares: el color que identifica al DJ en el campo. */
  jersey: string
  skin: string
  hair: string
  /** Peinado o lo que lleve en la cabeza. Es lo que hace reconocible la silueta. */
  head: 'buzz' | 'beanie' | 'long' | 'curly'
  glasses: 'shades' | 'round' | null
  /** Detalle de color: la cinta, el gorro… */
  accent: string
}

export type Dj = {
  id: DjId
  name: string
  style: string
  /** La ventaja en una frase, para la pantalla de selección. */
  perk: string
  stats: PlayerStats
  look: DjLook
}

export const DJS: Dj[] = [
  {
    id: 'burdina',
    name: 'Burdina',
    style: 'Hard techno',
    perk: 'Tiro más fuerte',
    stats: { speed: 1, jump: 1, kick: 1.15, timing: 1, power: 'scratch' },
    look: { jersey: '#ff3b4a', skin: '#f2c8a0', hair: '#1a1418', head: 'buzz', glasses: 'shades', accent: '#ff3b4a' },
  },
  {
    id: 'txiki',
    name: 'Txiki',
    style: 'Minimal',
    perk: 'Ventana PERFECT más amplia',
    stats: { speed: 1, jump: 1, kick: 1, timing: 1.25, power: 'loop' },
    look: { jersey: '#29d3c2', skin: '#e7b48c', hair: '#3b2a1e', head: 'beanie', glasses: 'round', accent: '#f3f1ec' },
  },
  {
    id: 'ilargi',
    name: 'Ilargi',
    style: 'Trance',
    perk: 'Salta más alto',
    stats: { speed: 1, jump: 1.08, kick: 1, timing: 1, power: 'lowpass' },
    look: { jersey: '#5f8bff', skin: '#fbd9bd', hair: '#e9e2ff', head: 'long', glasses: null, accent: '#ff5fd2' },
  },
  {
    id: 'etxe',
    name: 'Etxe',
    style: 'House',
    perk: 'Corre más rápido',
    stats: { speed: 1.08, jump: 1, kick: 1, timing: 1, power: 'cue' },
    look: { jersey: '#ff8a3d', skin: '#a8714c', hair: '#20150f', head: 'curly', glasses: null, accent: '#ffd84a' },
  },
]

export function getDj(id: string | undefined): Dj {
  return DJS.find((d) => d.id === id) ?? DJS[0]
}

export function isDjId(value: unknown): value is DjId {
  return typeof value === 'string' && DJS.some((d) => d.id === value)
}

/** Un rival al azar que no sea tu mismo DJ. */
export function pickRival(mine: DjId, random: () => number = Math.random): DjId {
  const others = DJS.filter((d) => d.id !== mine)
  return others[Math.floor(random() * others.length)].id
}
