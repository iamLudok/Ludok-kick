/**
 * Los escenarios: dónde se juega y cómo se ve. Cada uno tiene su paleta y su
 * decorado (dibujado en `src/render/decor.ts`). La música no es del
 * escenario sino del DJ (ver `genres.ts`).
 */
import type { StageDecor, StagePalette } from '../render/stage'

export type StageId = 'bilbao' | 'donostia' | 'caserio'

export type Stage = {
  id: StageId
  name: string
  place: string
  decor: StageDecor
  palette: StagePalette
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
  },
]

export function getStage(id: string | undefined): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0]
}

export function isStageId(value: unknown): value is StageId {
  return typeof value === 'string' && STAGES.some((s) => s.id === value)
}
