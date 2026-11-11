/**
 * La paleta de un escenario: todo lo que se pinta dentro del campo. Cada
 * escenario será un objeto como este; de momento solo existe el del prototipo.
 */
export type StagePalette = {
  /** Fondo, de arriba abajo. */
  wallTop: string
  wallBottom: string
  /** Lo que queda a los lados del campo en pantallas más anchas. */
  side: string
  floor: string
  floorEdge: string
  floorMark: string
  truss: string
  trussLine: string
  beam: string
  /** Portería: caja del altavoz, conos y larguero. */
  cabinet: string
  cone: string
  coneRing: string
  bar: string
  outline: string
  /** Color de cada jugador (izquierda, derecha). */
  players: [string, string]
  skin: string
  vinylRim: string
  vinylGroove: string
  vinylLabel: string
  /** El color con el que late el escenario en cada beat (suelo y anillo). */
  beatGlow: string
  /** Carteles de remate a tiempo. */
  good: string
  perfect: string
}

export const PROTOTYPE_STAGE: StagePalette = {
  wallTop: '#120d1f',
  wallBottom: '#2a1c47',
  side: '#0c0914',
  floor: '#191326',
  floorEdge: '#7A45C4',
  floorMark: '#2c2240',
  truss: '#0b0812',
  trussLine: '#3b3152',
  beam: '#b48cff',
  cabinet: '#0e0a17',
  cone: '#1d1730',
  coneRing: '#6b5a92',
  bar: '#cfc4e8',
  outline: '#0a0710',
  players: ['#29d3c2', '#ff8a3d'],
  skin: '#f6cfa6',
  vinylRim: '#e7e1f5',
  vinylGroove: '#3a3448',
  vinylLabel: '#ff4f9a',
  beatGlow: '#c9a8ff',
  good: '#7ce8ff',
  perfect: '#ffd84a',
}
