/**
 * La paleta de un escenario: todo lo que se pinta dentro del campo. Los
 * escenarios en sí (nombre, decorado, música) están en `src/content/stages.ts`.
 */
export type StagePalette = {
  /** Fondo, de arriba abajo: dos o tres colores. */
  wall: string[]
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
  vinylRim: string
  vinylGroove: string
  vinylLabel: string
  /** El color con el que late el escenario en cada beat (suelo y anillo). */
  beatGlow: string
  /** Carteles de remate a tiempo. */
  good: string
  perfect: string
  /** Poderes: botón cargado, carteles y efectos. */
  power: string
  /** Tinte del jugador a cámara lenta (Low-pass). */
  slow: string
  /** Colores del decorado; qué es cada uno depende del escenario (ver `decor.ts`). */
  deco: string[]
}

export type StageDecor = 'warehouse' | 'beach' | 'caserio'
