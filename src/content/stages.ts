/**
 * Los escenarios: dónde se juega, cómo se ve y qué suena. Cada uno tiene su
 * paleta, su decorado (dibujado en `src/render/decor.ts`) y su base.
 *
 * Las bases son rejillas de 16 pasos por compás. El bombo va SIEMPRE en las
 * cuatro negras (0, 4, 8, 12): son los beats contra los que se juzga el
 * remate, y `verify/sequencer.ts` comprueba que ningún escenario lo cambie.
 */
import type { Pattern } from '../audio/patterns'
import type { StageDecor, StagePalette } from '../render/stage'

export type StageId = 'bilbao' | 'donostia' | 'caserio'

export type Stage = {
  id: StageId
  name: string
  place: string
  decor: StageDecor
  palette: StagePalette
  pattern: Pattern
}

/** Colores comunes a todos los escenarios: los del vinilo, los carteles y los poderes. */
const COMMON = {
  outline: '#0a0710',
  vinylRim: '#e7e1f5',
  vinylGroove: '#3a3448',
  good: '#7ce8ff',
  perfect: '#ffd84a',
  power: '#ff5fd2',
  slow: '#5fb8ff',
}

export const STAGES: Stage[] = [
  {
    id: 'bilbao',
    name: 'Warehouse',
    place: 'Bilbao',
    decor: 'warehouse',
    palette: {
      ...COMMON,
      wall: ['#0e1219', '#232c3a'],
      side: '#0a0d12',
      floor: '#1a1d22',
      floorEdge: '#ff7a1a',
      floorMark: '#2c3038',
      truss: '#0a0c10',
      trussLine: '#3a4250',
      beam: '#ffb067',
      cabinet: '#0d1016',
      cone: '#1b2029',
      coneRing: '#5a6577',
      bar: '#c9d1dd',
      vinylLabel: '#ff7a1a',
      beatGlow: '#ffb067',
      deco: ['#2a3342', '#ff9a3c', '#141922', '#7a5038'],
    },
    // Techno industrial: bajo rodante a contratiempo y golpes de metal.
    pattern: {
      kick: [0, 4, 8, 12],
      hat: [2, 6, 10, 14],
      hat16: [1, 3, 5, 7, 9, 11, 13, 15],
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
    id: 'donostia',
    name: 'Atardecer',
    place: 'Donostia',
    decor: 'beach',
    palette: {
      ...COMMON,
      wall: ['#2b1d52', '#ff7b6e', '#ffc890'],
      side: '#1c1438',
      floor: '#7a5636',
      floorEdge: '#33d1c4',
      floorMark: '#94704d',
      truss: '#1c1438',
      trussLine: '#5a4a86',
      beam: '#fff0c2',
      cabinet: '#1a1430',
      cone: '#2a2248',
      coneRing: '#8a7ab8',
      bar: '#fff3dc',
      vinylLabel: '#33d1c4',
      beatGlow: '#ffe08a',
      deco: ['#ffe08a', '#1f7f93', '#7fe6dc', '#3b2346'],
    },
    // House melódico: platos con aire, palmas, bajo con groove y acordes cálidos.
    pattern: {
      kick: [0, 4, 8, 12],
      hat: [2, 6, 10, 14],
      hat16: [3, 7, 11, 15],
      openHat: [14],
      clap: [4, 12],
      bass: { 3: 0, 6: 7, 7: 0, 10: 12, 11: 0, 14: 7 },
      stab: [2, 7, 10],
      perc: [],
      percVoice: 'wood',
      bassWave: 'square',
      chords: [
        { root: -4, notes: [20, 24, 27, 31] },
        { root: -2, notes: [22, 26, 29, 33] },
        { root: 0, notes: [24, 27, 31, 34] },
        { root: -5, notes: [19, 22, 26, 29] },
      ],
      enter: { clap: 2, bass: 4, stab: 6, hat16: 8, perc: 999 },
    },
  },
  {
    id: 'caserio',
    name: 'Caserío rave',
    place: 'Gipuzkoa',
    decor: 'caserio',
    palette: {
      ...COMMON,
      wall: ['#1a1512', '#2e241d'],
      side: '#120e0b',
      floor: '#3a2617',
      floorEdge: '#ff3fb4',
      floorMark: '#523720',
      truss: '#1e140c',
      trussLine: '#5a3a22',
      beam: '#ff3fb4',
      cabinet: '#140e0a',
      cone: '#2a1e16',
      coneRing: '#8a6a50',
      bar: '#f0e0cc',
      vinylLabel: '#5fffb0',
      beatGlow: '#5fffb0',
      deco: ['#3a3029', '#5a3a22', '#2a1a0f', '#ff3fb4'],
    },
    // Rave: bajo a contratiempo con octavas, platos abiertos y madera a lo txalaparta.
    pattern: {
      kick: [0, 4, 8, 12],
      hat: [2, 6, 10, 14],
      hat16: [1, 5, 9, 13],
      openHat: [2, 6, 10, 14],
      clap: [4, 12],
      bass: { 2: 0, 3: 12, 6: 0, 7: 12, 10: 0, 11: 12, 14: 0, 15: 12 },
      stab: [0, 3, 6, 10],
      perc: [1, 3, 6, 9, 11, 14],
      percVoice: 'wood',
      bassWave: 'sawtooth',
      chords: [
        { root: 0, notes: [24, 27, 31] },
        { root: -2, notes: [22, 26, 29] },
        { root: -4, notes: [20, 24, 27] },
        { root: -5, notes: [19, 22, 26] },
      ],
      enter: { perc: 1, clap: 2, bass: 4, hat16: 8, stab: 8 },
    },
  },
]

export function getStage(id: string | undefined): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0]
}

export function isStageId(value: unknown): value is StageId {
  return typeof value === 'string' && STAGES.some((s) => s.id === value)
}
